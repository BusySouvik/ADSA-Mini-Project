#pragma once

#include <algorithm>
#include <cctype>
#include <cmath>
#include <functional>
#include <iostream>
#include <list>
#include <memory>
#include <queue>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>
#include <sstream>

inline std::string jsonEscape(const std::string& value) {
    std::ostringstream out;
    for (unsigned char c : value) {
        switch (c) {
            case '"': out << "\""; break;
            case '\\': out << "\\"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (c < 0x20) {
                    const char* hex = "0123456789abcdef";
                    out << "\\u00" << hex[c >> 4] << hex[c & 0x0f];
                } else out << static_cast<char>(c);
        }
    }
    return out.str();
}

struct Product {
    std::string id;
    std::string productCode;
    std::string name;
    double price;
    int stock;
};

// 1. AVL TREE: Index products by price
class AVLTree {
private:
    struct Node {
        double price;
        std::vector<std::string> productIds;
        int height;
        Node* left;
        Node* right;

        Node(double p, const std::string& id)
            : price(p), productIds{id}, height(1),
              left(nullptr), right(nullptr) {}
    };

    Node* root = nullptr;
    std::vector<std::pair<std::string, double>> rotationEvents;

    int height(Node* n) const {
        return n ? n->height : 0;
    }

    int balance(Node* n) const {
        return n ? height(n->left) - height(n->right) : 0;
    }

    void updateHeight(Node* n) {
        n->height = 1 + std::max(height(n->left), height(n->right));
    }

    Node* rotateRight(Node* y) {
        Node* x = y->left;
        Node* t = x->right;
        x->right = y;
        y->left = t;
        updateHeight(y);
        updateHeight(x);
        return x;
    }

    Node* rotateLeft(Node* x) {
        Node* y = x->right;
        Node* t = y->left;
        y->left = x;
        x->right = t;
        updateHeight(x);
        updateHeight(y);
        return y;
    }

    Node* insertNode(Node* node, double price, const std::string& id) {
        if (!node) return new Node(price, id);

        if (price < node->price)
            node->left = insertNode(node->left, price, id);
        else if (price > node->price)
            node->right = insertNode(node->right, price, id);
        else {
            node->productIds.push_back(id);
            return node;
        }

        updateHeight(node);
        int b = balance(node);

        if (b > 1 && price < node->left->price) {
            rotationEvents.push_back({"LL", node->price});
            return rotateRight(node);
        }

        if (b < -1 && price > node->right->price) {
            rotationEvents.push_back({"RR", node->price});
            return rotateLeft(node);
        }

        if (b > 1 && price > node->left->price) {
            rotationEvents.push_back({"LR", node->price});
            node->left = rotateLeft(node->left);
            return rotateRight(node);
        }

        if (b < -1 && price < node->right->price) {
            rotationEvents.push_back({"RL", node->price});
            node->right = rotateRight(node->right);
            return rotateLeft(node);
        }

        return node;
    }

    void rangeSearch(Node* node, double low, double high,
                     std::vector<std::string>& result) const {
        if (!node) return;

        if (node->price > low)
            rangeSearch(node->left, low, high, result);

        if (node->price >= low && node->price <= high) {
            for (const auto& id : node->productIds)
                result.push_back(id);
        }

        if (node->price < high)
            rangeSearch(node->right, low, high, result);
    }

    void destroy(Node* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }

    void writeNodeJson(std::ostream& out, Node* node) const {
        if (!node) { out << "null"; return; }
        out << "{\"price\":" << node->price
            << ",\"height\":" << node->height
            << ",\"balance\":" << balance(node)
            << ",\"productIds\":[";
        for (std::size_t i = 0; i < node->productIds.size(); ++i) {
            if (i) out << ",";
            out << "\"" << jsonEscape(node->productIds[i]) << "\"";
        }
        out << "],\"left\":";
        writeNodeJson(out, node->left);
        out << ",\"right\":";
        writeNodeJson(out, node->right);
        out << "}";
    }

public:
    ~AVLTree() { destroy(root); }

    void insert(double price, const std::string& id) {
        root = insertNode(root, price, id);
    }

    std::vector<std::string> searchPriceRange(double low, double high) const {
        std::vector<std::string> result;
        rangeSearch(root, low, high, result);
        return result;
    }

    void writeSnapshot(std::ostream& out) const { writeNodeJson(out, root); }

    void writeRotationEvents(std::ostream& out) const {
        out << "[";
        for (std::size_t i = 0; i < rotationEvents.size(); ++i) {
            if (i) out << ",";
            out << "{\"type\":\"" << rotationEvents[i].first
                << "\",\"pivotPrice\":" << rotationEvents[i].second << "}";
        }
        out << "]";
    }
};

// 2. HASH TABLE: Product lookup by UUID and Product Code
class ProductHashTable {
private:
    static constexpr std::size_t CAPACITY = 101;
    std::vector<std::list<std::pair<std::string, Product>>> table;

    static std::string normalize(const std::string& key) {
        std::string result = key;
        for (char& c : result) {
            c = static_cast<char>(
                std::toupper(static_cast<unsigned char>(c))
            );
        }
        return result;
    }

    std::size_t hashKey(const std::string& key) const {
        return std::hash<std::string>{}(normalize(key)) % CAPACITY;
    }

    void insertKey(const std::string& key, const Product& product) {
        if (key.empty()) return;

        const std::string normalizedKey = normalize(key);
        auto& bucket = table[hashKey(normalizedKey)];

        for (auto& entry : bucket) {
            if (entry.first == normalizedKey) {
                entry.second = product;
                return;
            }
        }

        bucket.push_back({normalizedKey, product});
    }

public:
    ProductHashTable() : table(CAPACITY) {}

    void insert(const Product& product) {
        insertKey(product.id, product);
        insertKey(product.productCode, product);
    }

    Product* find(const std::string& key) {
        const std::string normalizedKey = normalize(key);
        auto& bucket = table[hashKey(normalizedKey)];

        for (auto& entry : bucket) {
            if (entry.first == normalizedKey)
                return &entry.second;
        }

        return nullptr;
    }

    void writeSnapshot(std::ostream& out) const {
        out << "[";
        for (std::size_t i = 0; i < table.size(); ++i) {
            if (i) out << ",";
            out << "{\"index\":" << i << ",\"entries\":[";
            bool first = true;
            for (const auto& entry : table[i]) {
                if (!first) out << ",";
                first = false;
                out << "{\"key\":\"" << jsonEscape(entry.first)
                    << "\",\"productId\":\""
                    << jsonEscape(entry.second.id) << "\",\"name\":\""
                    << jsonEscape(entry.second.name) << "\"}";
            }
            out << "]}";
        }
        out << "]";
    }
};
// 3. TRIE: Product name autocomplete
class ProductTrie {
private:
    struct Node {
        std::unordered_map<char, std::unique_ptr<Node>> children;
        bool terminal = false;
        std::vector<std::string> productIds;
    };

    Node root;

    static std::string normalize(const std::string& text) {
        std::string result = text;
        for (char& c : result)
            c = static_cast<char>(
                std::tolower(static_cast<unsigned char>(c))
            );
        return result;
    }

    void collect(Node* node, std::vector<std::string>& result) const {
        if (node->terminal) {
            for (const auto& id : node->productIds)
                result.push_back(id);
        }

        for (auto& child : node->children)
            collect(child.second.get(), result);
    }

    void writeNodeJson(std::ostream& out, const Node* node) const {
        out << "{\"terminal\":" << (node->terminal ? "true" : "false")
            << ",\"productIds\":[";
        for (std::size_t i = 0; i < node->productIds.size(); ++i) {
            if (i) out << ",";
            out << "\"" << jsonEscape(node->productIds[i]) << "\"";
        }
        out << "],\"children\":[";
        std::vector<char> keys;
        for (const auto& item : node->children) keys.push_back(item.first);
        std::sort(keys.begin(), keys.end());
        for (std::size_t i = 0; i < keys.size(); ++i) {
            if (i) out << ",";
            char key = keys[i];
            out << "{\"char\":\"" << jsonEscape(std::string(1, key))
                << "\",\"node\":";
            writeNodeJson(out, node->children.at(key).get());
            out << "}";
        }
        out << "]}";
    }

public:
    void insert(const std::string& name, const std::string& id) {
        Node* current = &root;
        std::string key = normalize(name);

        for (char c : key) {
            if (!current->children[c])
                current->children[c] = std::make_unique<Node>();

            current = current->children[c].get();
        }

        current->terminal = true;
        current->productIds.push_back(id);
    }

    std::vector<std::string> autocomplete(const std::string& prefix) const {
        Node* current = const_cast<Node*>(&root);
        std::string key = normalize(prefix);

        for (char c : key) {
            auto it = current->children.find(c);
            if (it == current->children.end())
                return {};
            current = it->second.get();
        }

        std::vector<std::string> result;
        collect(current, result);
        return result;
    }

    void writeSnapshot(std::ostream& out) const { writeNodeJson(out, &root); }
};

// 4. MIN HEAP: Products with lowest stock first
struct StockEntry {
    int stock;
    std::string productId;
};

class StockMinHeap {
private:
    std::vector<StockEntry> heap;

    void siftUp(int index) {
        while (index > 0) {
            int parent = (index - 1) / 2;
            if (heap[parent].stock <= heap[index].stock) break;
            std::swap(heap[parent], heap[index]);
            index = parent;
        }
    }

    void siftDown(int index) {
        int size = static_cast<int>(heap.size());

        while (true) {
            int smallest = index;
            int left = 2 * index + 1;
            int right = 2 * index + 2;

            if (left < size &&
                heap[left].stock < heap[smallest].stock)
                smallest = left;

            if (right < size &&
                heap[right].stock < heap[smallest].stock)
                smallest = right;

            if (smallest == index) break;

            std::swap(heap[index], heap[smallest]);
            index = smallest;
        }
    }

public:
    void push(int stock, const std::string& id) {
        heap.push_back({stock, id});
        siftUp(static_cast<int>(heap.size()) - 1);
    }

    bool empty() const { return heap.empty(); }

    StockEntry pop() {
        if (empty()) throw std::runtime_error("Heap is empty");

        StockEntry result = heap.front();
        heap.front() = heap.back();
        heap.pop_back();

        if (!heap.empty()) siftDown(0);
        return result;
    }

    void writeSnapshot(std::ostream& out) const {
        out << "[";
        for (std::size_t i = 0; i < heap.size(); ++i) {
            if (i) out << ",";
            out << "{\"stock\":" << heap[i].stock
                << ",\"productId\":\""
                << jsonEscape(heap[i].productId) << "\"}";
        }
        out << "]";
    }
};

// 5. FIFO QUEUE: Restocking requests
class RestockQueue {
private:
    std::queue<std::string> requests;

public:
    void addRequest(const std::string& productId) {
        requests.push(productId);
    }

    bool empty() const {
        return requests.empty();
    }

    std::string processNext() {
        if (empty()) return "";

        std::string id = requests.front();
        requests.pop();
        return id;
    }

    std::size_t size() const {
        return requests.size();
    }

    void writeSnapshot(std::ostream& out) const {
        std::queue<std::string> copy = requests;
        out << "[";
        bool first = true;
        while (!copy.empty()) {
            if (!first) out << ",";
            first = false;
            out << "\"" << jsonEscape(copy.front()) << "\"";
            copy.pop();
        }
        out << "]";
    }
};

