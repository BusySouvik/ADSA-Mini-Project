import OwnerDashboard from "./OwnerDashboard";
import ShopCatalogue from "./ShopCatalogue";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShoppingBag, Store } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./pages.css";

function PageHeader() {
  return (
    <header className="page-header">
      <Link to="/" className="page-brand">shop<span className="brand-dot">.</span>corner</Link>
      <Link to="/" className="back-home"><ArrowLeft size={16}/> Back to home</Link>
    </header>
  );
}

function Message({ children }: { children: string }) {
  return <p className="auth-message" role="status">{children}</p>;
}

export function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isOwner = params.get("role") === "owner";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          requested_role: isOwner ? "owner" : "customer",
        },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      navigate(isOwner ? "/admin" : "/shop");
    } else {
      setMessage(
        isOwner
          ? "Registration submitted. Verify your email. Your owner access will require approval."
          : "Registration successful. Check your email and click the verification link before logging in."
      );
    }
  }

  return (
    <main className="auth-page">
      <PageHeader/>
      <section className="auth-layout">
        <div className="auth-intro">
          <span className="eyebrow">CREATE YOUR ACCOUNT</span>
          <h1>{isOwner ? "Build your store." : "Start discovering."}</h1>
          <p>{isOwner
            ? "Create your store owner account and request access to inventory management."
            : "Create your account to discover products and enjoy smarter shopping."}</p>
          <div className="role-switch">
            <Link className={!isOwner ? "selected" : ""} to="/register"><ShoppingBag size={17}/> Customer</Link>
            <Link className={isOwner ? "selected" : ""} to="/register?role=owner"><Store size={17}/> Store owner</Link>
          </div>
        </div>
        <form className="auth-form" onSubmit={handleRegister}>
          <h2>Create {isOwner ? "owner" : "customer"} account</h2>
          <p>Enter your details to get started.</p>
          <label>Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required/>
          <label>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required/>
          {message && <Message>{message}</Message>}
          {isOwner && <p className="form-note">Owner accounts require approval before accessing the dashboard.</p>}
          <button type="submit" className="page-primary-button" disabled={loading}>
            {loading ? "Creating account..." : "Create account"} <ArrowRight size={17}/>
          </button>
          <p className="auth-switch">Already have an account? <Link to={isOwner ? "/login?role=owner" : "/login"}>Log in</Link></p>
        </form>
      </section>
    </main>
  );
}

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isOwner = params.get("role") === "owner";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, requested_role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setMessage("Your profile could not be loaded. Contact support.");
      return;
    }

    if (isOwner && profile.role !== "owner") {
      await supabase.auth.signOut();
      setMessage(profile.requested_role === "owner"
        ? "Your owner account is awaiting approval."
        : "This account does not have owner access.");
      return;
    }

    if (!isOwner && profile.role === "owner") {
      navigate("/admin");
      return;
    }

    navigate(profile.role === "owner" ? "/admin" : "/shop");
  }

  return (
    <main className="auth-page">
      <PageHeader/>
      <section className="auth-layout single-auth">
        <div className="auth-intro">
          <span className="eyebrow">WELCOME BACK</span>
          <h1>{isOwner ? "Welcome back, owner." : "Good to see you again."}</h1>
          <p>Log in to continue to your Shop-Corner experience.</p>
        </div>
        <form className="auth-form" onSubmit={handleLogin}>
          <h2>{isOwner ? "Owner login" : "Log in"}</h2>
          <p>Enter your account details.</p>
          <label>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required/>
          {message && <Message>{message}</Message>}
          <button type="submit" className="page-primary-button" disabled={loading}>
            {loading ? "Logging in..." : "Log in"} <ArrowRight size={17}/>
          </button>
          <p className="auth-switch">New to Shop-Corner? <Link to={isOwner ? "/register?role=owner" : "/register"}>Create an account</Link></p>
        </form>
      </section>
    </main>
  );
}

export function ShopPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let active = true;
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setChecking(false);
        return;
      }
      setUserEmail(data.user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (profile?.role === "owner") navigate("/admin");
      else setChecking(false);
    }
    checkUser();
    return () => { active = false; };
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/shop");
  }

  if (checking) return <main className="simple-page"><p className="page-loading">Loading your shopping experience...</p></main>;

  return (
    <main className="simple-page">
      <PageHeader/>
      {!userEmail ? (
        <section className="simple-page-content">
          <span className="eyebrow">CUSTOMER EXPERIENCE</span>
          <h1>Discover more.<br/>Shop smarter.</h1>
          <p>Log in or create a customer account to explore the Shop-Corner experience.</p>
          <div className="entry-actions">
            <Link to="/login" className="page-primary-button">Customer log in <ArrowRight size={17}/></Link>
            <Link to="/register" className="entry-secondary-button">Create customer account</Link>
          </div>
        </section>
      ) : (
        <ShopCatalogue userEmail={userEmail} onLogout={logout}/>
      )}
    </main>
  );
}

export function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyOwner() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        if (active) setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!active) return;

      if (profile?.role === "owner") {
        setAllowed(true);
      } else {
        setAllowed(false);
      }

      setChecking(false);
    }

    void verifyOwner();
    return () => { active = false; };
  }, []);

  if (checking) {
    return <main className="simple-page"><p className="page-loading">Verifying owner access...</p></main>;
  }

  if (!allowed) {
    return (
      <main className="simple-page">
        <PageHeader/>
        <section className="simple-page-content">
          <span className="eyebrow">OWNER ACCESS</span>
          <h1>Access required.</h1>
          <p>Please log in with an approved owner account to access inventory management.</p>
          <div className="entry-actions">
            <Link to="/login?role=owner" className="page-primary-button">Owner log in</Link>
            <Link to="/register?role=owner" className="entry-secondary-button">Create owner account</Link>
          </div>
        </section>
      </main>
    );
  }

  return <OwnerDashboard/>;
}




