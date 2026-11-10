#include "engine.hpp"
#include <iomanip>

int main() {
    std::vector<Product> products = {
        {"demo-001", "P101", "Laptop", 55000, 3},
        {"demo-002", "P102", "Wireless Mouse", 799, 20},
        {"demo-003", "P103", "Mechanical Keyboard", 2499, 2},
        {"demo-004", "P104", "Laptop Stand", 1299, 5},
        {"demo-005", "P105", "USB Hub", 999, 1}
    };

    std::cout << "\n====================================\n";
    std::cout << "       SHOP-CORNER ADSA ENGINE\n";
    std::cout << "====================================\n";

    // AVL Tree
    AVLTree avl;
    for (const auto& p : products)
        avl.insert(p.price, p.id);

    std::cout << "\n1. AVL TREE - Products priced 500 to 3000:\n";
    auto priceResults = avl.searchPriceRange(500, 3000);
    for (const auto& id : priceResults)
        std::cout << "   " << id << '\n';

    // Hash Table
    ProductHashTable hashTable;
    for (const auto& p : products)
        hashTable.insert(p);

    std::cout << "\n2. HASH TABLE - Lookup P103:\n";
    Product* found = hashTable.find("P103");
    if (found)
        std::cout << "   " << found->name
                  << " | Rs. " << found->price << '\n';
    else
        std::cout << "   Product not found\n";

    // Trie
    ProductTrie trie;
    for (const auto& p : products)
        trie.insert(p.name, p.id);

    std::cout << "\n3. TRIE - Autocomplete 'lap':\n";
    auto suggestions = trie.autocomplete("lap");
    for (const auto& id : suggestions)
        std::cout << "   " << id << '\n';

    // Min Heap
    StockMinHeap minHeap;
    for (const auto& p : products)
        minHeap.push(p.stock, p.id);

    std::cout << "\n4. MIN HEAP - Lowest stock first:\n";
    while (!minHeap.empty()) {
        auto item = minHeap.pop();
        std::cout << "   " << item.productId
                  << " | Stock: " << item.stock << '\n';
    }

    // FIFO Queue
    RestockQueue restock;
    restock.addRequest("P103");
    restock.addRequest("P105");
    restock.addRequest("P101");

    std::cout << "\n5. FIFO QUEUE - Restock processing:\n";
    while (!restock.empty())
        std::cout << "   Processing: "
                  << restock.processNext() << '\n';

    std::cout << "\n====================================\n";
    std::cout << "       ALL TESTS COMPLETED\n";
    std::cout << "====================================\n";

    return 0;
}
