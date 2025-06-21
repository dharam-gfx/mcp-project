import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to inventory data
const inventoryPath = path.join(__dirname, '../../data/inventory.json');

// GET all inventory
router.get('/', (req, res) => {
    try {
        const { limit = '100', page = '1', sortBy = '' } = req.query;
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        // Sort results if sortBy is specified
        let sortedInventory = [...inventoryData];
        if (sortBy) {
            switch(sortBy) {
                case 'price-asc':
                    sortedInventory.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    sortedInventory.sort((a, b) => b.price - a.price);
                    break;
                case 'year-asc':
                    sortedInventory.sort((a, b) => a.year - b.year);
                    break;
                case 'year-desc':
                    sortedInventory.sort((a, b) => b.year - a.year);
                    break;
            }
        }
        
        // Apply pagination
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = parseInt(limit) || 100;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Get paginated results
        const paginatedInventory = sortedInventory.slice(startIndex, endIndex);
        
        // Return result with metadata
        res.json({
            total: inventoryData.length,
            page: pageNumber,
            limit: itemsPerPage,
            results: paginatedInventory
        });
    } catch (error) {
        console.error('Error reading inventory data:', error);
        res.status(500).json({ error: 'Failed to load inventory data' });
    }
});

// GET inventory by brand
router.get('/brand/:brandName', (req, res) => {
    try {
        const { brandName } = req.params;
        const { limit = '100', page = '1', sortBy = '' } = req.query;
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        const filteredInventory = inventoryData.filter(item => 
            item.brand.toLowerCase() === brandName.toLowerCase()
        );
        
        if (filteredInventory.length === 0) {
            return res.status(404).json({ message: `No items found for brand: ${brandName}` });
        }
        
        // Sort results if sortBy is specified
        let sortedInventory = [...filteredInventory];
        if (sortBy) {
            switch(sortBy) {
                case 'price-asc':
                    sortedInventory.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    sortedInventory.sort((a, b) => b.price - a.price);
                    break;
                case 'year-asc':
                    sortedInventory.sort((a, b) => a.year - b.year);
                    break;
                case 'year-desc':
                    sortedInventory.sort((a, b) => b.year - a.year);
                    break;
            }
        }
        
        // Apply pagination
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = parseInt(limit) || 100;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Get paginated results
        const paginatedInventory = sortedInventory.slice(startIndex, endIndex);
        
        // Return result with metadata
        res.json({
            total: filteredInventory.length,
            page: pageNumber,
            limit: itemsPerPage,
            results: paginatedInventory
        });
    } catch (error) {
        console.error('Error filtering inventory by brand:', error);
        res.status(500).json({ error: 'Failed to filter inventory data' });
    }
});

// GET inventory by specific filters (query parameters)
router.get('/filter', (req, res) => {
    try {
        const { 
            brand, 
            model, 
            minPrice, 
            maxPrice, 
            color, 
            fuelType, 
            transmission,
            limit = '100',   // Default limit to 100 items if not specified
            sortBy = '',     // Optional sorting parameter
            page = '1'       // Support for pagination
        } = req.query;
        
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        // Filter inventory based on criteria
        const filteredInventory = inventoryData.filter(item => {
            let match = true;
            
            if (brand && !item.brand.toLowerCase().includes(brand.toLowerCase())) match = false;
            if (model && !item.model.toLowerCase().includes(model.toLowerCase())) match = false;
            if (minPrice && item.price < parseInt(minPrice)) match = false;
            if (maxPrice && item.price > parseInt(maxPrice)) match = false;
            if (color && !item.color.toLowerCase().includes(color.toLowerCase())) match = false;
            if (fuelType && !item.fuelType.toLowerCase().includes(fuelType.toLowerCase())) match = false;
            if (transmission && !item.transmission.toLowerCase().includes(transmission.toLowerCase())) match = false;
            
            return match;
        });
        
        // Sort results if sortBy is specified
        let sortedInventory = [...filteredInventory];
        if (sortBy) {
            switch(sortBy) {
                case 'price-asc':
                    sortedInventory.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    sortedInventory.sort((a, b) => b.price - a.price);
                    break;
                case 'year-asc':
                    sortedInventory.sort((a, b) => a.year - b.year);
                    break;
                case 'year-desc':
                    sortedInventory.sort((a, b) => b.year - a.year);
                    break;
            }
        }
        
        // Apply pagination
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = parseInt(limit) || 100;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Get paginated results
        const paginatedInventory = sortedInventory.slice(startIndex, endIndex);
        
        // Return result with metadata
        res.json({
            total: filteredInventory.length,
            page: pageNumber,
            limit: itemsPerPage,
            results: paginatedInventory
        });
    } catch (error) {
        console.error('Error filtering inventory:', error);
        res.status(500).json({ error: 'Failed to filter inventory data' });
    }
});

// GET inventory by search query (searches across multiple fields)
router.get('/search', (req, res) => {
    try {
        const { 
            q,              // Search query term
            limit = '100',   // Default limit
            sortBy = '',     // Optional sorting parameter
            page = '1'       // Support for pagination
        } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query parameter "q" is required' });
        }
        
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        const searchTerm = q.toLowerCase();
        
        // Search across multiple fields
        const filteredInventory = inventoryData.filter(item => {
            return Object.values(item).some(value => {
                // Convert the value to string and check if it includes the search term
                if (value !== null && value !== undefined) {
                    return String(value).toLowerCase().includes(searchTerm);
                }
                return false;
            });
        });
        
        // Sort results if sortBy is specified
        let sortedInventory = [...filteredInventory];
        if (sortBy) {
            switch(sortBy) {
                case 'price-asc':
                    sortedInventory.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    sortedInventory.sort((a, b) => b.price - a.price);
                    break;
                case 'year-asc':
                    sortedInventory.sort((a, b) => a.year - b.year);
                    break;
                case 'year-desc':
                    sortedInventory.sort((a, b) => b.year - a.year);
                    break;
            }
        }
        
        // Apply pagination
        const pageNumber = parseInt(page) || 1;
        const itemsPerPage = parseInt(limit) || 100;
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Get paginated results
        const paginatedInventory = sortedInventory.slice(startIndex, endIndex);
        
        // Return result with metadata
        res.json({
            total: filteredInventory.length,
            page: pageNumber,
            limit: itemsPerPage,
            results: paginatedInventory,
            searchTerm: q
        });
    } catch (error) {
        console.error('Error searching inventory:', error);
        res.status(500).json({ error: 'Failed to search inventory data' });
    }
});

// GET inventory item by ID (using array index)
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        if (id < 0 || id >= inventoryData.length || isNaN(id)) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json(inventoryData[id]);
    } catch (error) {
        console.error('Error getting inventory item:', error);
        res.status(500).json({ error: 'Failed to get inventory item' });
    }
});

export { router as inventoryRoutes };
