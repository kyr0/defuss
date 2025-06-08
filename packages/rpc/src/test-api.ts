// Test API classes for RPC testing
export class TestUserApi {
  async getUser(id: string) {
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      age: Number.parseInt(id) * 10,
    };
  }

  async createUser(userData: { name: string; email: string; age: number }) {
    return {
      id: "new-user-id",
      ...userData,
      createdAt: new Date().toISOString(),
    };
  }

  async updateUser(
    id: string,
    updates: Partial<{ name: string; email: string; age: number }>,
  ) {
    return {
      id,
      name: updates.name || `User ${id}`,
      email: updates.email || `user${id}@example.com`,
      age: updates.age || Number.parseInt(id) * 10,
      updatedAt: new Date().toISOString(),
    };
  }

  async deleteUser(id: string) {
    return { success: true, deletedId: id };
  }

  // Synchronous method for testing
  getUserCount() {
    return 42;
  }
}

export class TestProductApi {
  async getProduct(id: string) {
    return {
      id,
      name: `Product ${id}`,
      price: Number.parseFloat(id) * 100,
      category: "test-category",
    };
  }

  async searchProducts(query: string, limit = 10) {
    const products = [];
    for (let i = 1; i <= limit; i++) {
      products.push({
        id: `product-${i}`,
        name: `${query} Product ${i}`,
        price: i * 50,
        category: "search-results",
      });
    }
    return products;
  }

  async throwError() {
    throw new Error("This is a test error");
  }

  // Method that returns complex data structures
  async getComplexData() {
    return {
      metadata: {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
      data: [
        { nested: { value: 123, array: [1, 2, 3] } },
        { nested: { value: 456, array: [4, 5, 6] } },
      ],
      buffer: new ArrayBuffer(8),
      date: new Date(),
      map: new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]),
    };
  }
}
