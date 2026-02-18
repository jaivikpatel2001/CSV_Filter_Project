/**
 * Simple in-memory store for fallback when MongoDB is unavailable
 */

const store = {
    Upload: [],
    Transform: [],
    DepositMap: []
};

const enhance = (modelName, data) => {
    if (!data) return null;
    return {
        ...data,
        save: async function () {
            return memoryStore.save(modelName, this);
        },
        toObject: function () {
            const { save, toObject, ...rest } = this;
            return rest;
        }
    };
};

export const memoryStore = {
    save: (modelName, doc) => {
        // Ensure store exists for model
        if (!store[modelName]) {
            store[modelName] = [];
        }
        let collection = store[modelName];

        // Convert to plain object if it's a mongoose document or our enhanced object
        let data;
        if (typeof doc.toObject === 'function') {
            data = doc.toObject();
        } else {
            const { save, toObject, ...rest } = doc;
            data = rest;
        }

        // Find existing record by unique ID
        let idField = 'uploadId';
        if (modelName === 'Transform') idField = 'transformId';
        if (modelName === 'DepositMap') idField = 'depositMapId';

        const existingIndex = collection.findIndex(d => d[idField] === data[idField]);

        if (existingIndex >= 0) {
            collection[existingIndex] = { ...collection[existingIndex], ...data };
            return enhance(modelName, collection[existingIndex]);
        } else {
            collection.push(data);
            return enhance(modelName, data);
        }
    },

    findOne: (modelName, query) => {
        if (!store[modelName]) return null;

        const collection = store[modelName];
        const item = collection.find(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });

        return enhance(modelName, item);
    },

    find: (modelName, query = {}) => {
        if (!store[modelName]) return [];

        const collection = store[modelName];
        // Sort by createdAt descending (mocking default sort)
        const items = collection
            .filter(item => {
                if (Object.keys(query).length === 0) return true;
                return Object.keys(query).every(key => item[key] === query[key]);
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return items.map(item => enhance(modelName, item));
    },

    deleteOne: (modelName, query) => {
        if (!store[modelName]) return { deletedCount: 0 };

        const collection = store[modelName];
        const index = collection.findIndex(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });

        if (index >= 0) {
            store[modelName].splice(index, 1);
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    }
};
