#include "engine.hpp"
#include <sstream>
#include <stdexcept>

std::vector<std::string> split(const std::string& line, char delimiter) {
    std::vector<std::string> fields;
    std::stringstream stream(line);
    std::string field;

    while (std::getline(stream, field, delimiter))
        fields.push_back(field);

    return fields;
}

int main() {
    std::string commandLine;
    if (!std::getline(std::cin, commandLine)) return 1;

    auto command = split(commandLine, '|');
    if (command.empty()) return 1;

    std::string mode = command[0];

    // Persistent FIFO request processing.
    // Input contains one restock request ID per line.
    if (mode == "fifo_ids") {
        RestockQueue queue;
        std::string requestId;

        while (std::getline(std::cin, requestId)) {
            if (!requestId.empty()) {
                queue.addRequest(requestId);
            }
        }

        while (!queue.empty()) {
            std::cout << queue.processNext() << '\n';
        }

        return 0;
    }

    std::vector<Product> products;
    std::string line;

    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        auto fields = split(line, '|');
        if (fields.size() < 5) continue;

        try {
            products.push_back({
                fields[0],
                fields[1],
                fields[2],
                std::stod(fields[3]),
                std::stoi(fields[4])
            });
        } catch (...) {
            continue;
        }
    }

    AVLTree avl;
    ProductHashTable hashTable;
    ProductTrie trie;
    StockMinHeap minHeap;
    RestockQueue queue;

    for (const auto& p : products) {
        avl.insert(p.price, p.id);
        hashTable.insert(p);
        trie.insert(p.name, p.id);
        minHeap.push(p.stock, p.id);
    }

    if (mode == "autocomplete") {
        if (command.size() < 2) return 1;
        for (const auto& id : trie.autocomplete(command[1]))
            std::cout << id << '\n';
    }
    else if (mode == "price_range") {
        if (command.size() < 3) return 1;
        double low = std::stod(command[1]);
        double high = std::stod(command[2]);

        for (const auto& id : avl.searchPriceRange(low, high))
            std::cout << id << '\n';
    }
    else if (mode == "lookup") {
        if (command.size() < 2) return 1;
        Product* product = hashTable.find(command[1]);

        if (product)
            std::cout << product->id << '\n';
    }
    else if (mode == "low_stock" || mode == "restock_queue") {
        if (command.size() < 2) return 1;
        int threshold = std::stoi(command[1]);

        if (mode == "low_stock") {
            while (!minHeap.empty()) {
                auto item = minHeap.pop();
                if (item.stock > threshold) break;
                std::cout << item.productId << '\n';
            }
        } else {
            for (const auto& p : products) {
                if (p.stock <= threshold)
                    queue.addRequest(p.id);
            }

            while (!queue.empty())
                std::cout << queue.processNext() << '\n';
        }
    }
    else {
        std::cerr << "Unknown ADSA operation";
        return 2;
    }

    return 0;
}


