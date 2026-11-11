CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid;
    v_role text;
    v_customer_id uuid;
    v_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT role
    INTO v_role
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_role NOT IN ('customer', 'owner') OR v_role IS NULL THEN
        RAISE EXCEPTION 'Customer or owner account required';
    END IF;

    SELECT customer_id, status
    INTO v_customer_id, v_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_role = 'customer' THEN
        IF v_customer_id <> v_user_id THEN
            RAISE EXCEPTION 'You can only cancel your own orders';
        END IF;

        IF v_status <> 'pending' THEN
            RAISE EXCEPTION 'Only pending orders can be cancelled by customers';
        END IF;

    ELSIF v_role = 'owner' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.order_items
            WHERE order_id = p_order_id
        ) THEN
            RAISE EXCEPTION 'Order has no items';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.order_items oi
            JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = p_order_id
              AND p.owner_id IS DISTINCT FROM v_user_id
        ) THEN
            RAISE EXCEPTION 'This order contains products from another store';
        END IF;

        IF v_status NOT IN ('pending', 'confirmed', 'processing') THEN
            RAISE EXCEPTION 'This order can no longer be cancelled';
        END IF;
    END IF;

    -- Lock affected product rows in a consistent order.
    PERFORM p.id
    FROM public.products p
    JOIN (
        SELECT product_id
        FROM public.order_items
        WHERE order_id = p_order_id
        GROUP BY product_id
    ) oi ON oi.product_id = p.id
    ORDER BY p.id
    FOR UPDATE OF p;

    -- Restore the exact quantities recorded at checkout.
    UPDATE public.products p
    SET
        stock = p.stock + restored.quantity,
        updated_at = NOW()
    FROM (
        SELECT product_id, SUM(quantity)::integer AS quantity
        FROM public.order_items
        WHERE order_id = p_order_id
        GROUP BY product_id
    ) restored
    WHERE p.id = restored.product_id;

    UPDATE public.orders
    SET status = 'cancelled'
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'message', 'Order cancelled and inventory restored',
        'order_id', p_order_id,
        'status', 'cancelled'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;
