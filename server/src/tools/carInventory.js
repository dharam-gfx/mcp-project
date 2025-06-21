import { z } from "zod";
import fetch from "node-fetch";

const BASE_URL = "http://localhost:3001/api/inventory";

/**
 * Context preserving helper for pagination
 */
let lastSearchContext = {
    brand: null,
    model: null,
    minPrice: null,
    maxPrice: null,
    color: null,
    fuelType: null,
    transmission: null,
    search: null,
    sortBy: null,
    limit: 5,
    page: 1
};

// Track natural language references
let conversationalContext = {
    lastPriceRange: null,  // Store last used price range for references like "same price"
    lastBrand: null,       // Store last brand for references
    lastQuery: null,       // Store last full query for context
    lastResults: null      // Store last results price stats for references like "cheapest"
};

/**
 * Normalize price input - handles various formats like "6,70,000", "670000", etc.
 * @param {string|number} price - Price in various formats
 * @returns {number|undefined} - Normalized price as number or undefined if invalid
 */
const normalizePrice = (price) => {
    if (price === undefined || price === null) return undefined;
    
    // If already a number, return as is
    if (typeof price === 'number') return price;
    
    // If string, try to convert it
    if (typeof price === 'string') {
        // Remove currency symbols, commas and spaces
        const cleanPrice = price.replace(/[₹,\s]/g, '');
        const parsedPrice = parseFloat(cleanPrice);
        
        if (!isNaN(parsedPrice)) {
            return parsedPrice;
        }
    }
    
    return undefined;
};

const getCarInventory = async (params = {}) => {
    try {
        let url = BASE_URL;
          // Extract the limit and page parameters
        const limit = Math.min(params.limit || 5, 10); // Cap at 10 cars per page
        const page = params.page || 1;
        
        // Normalize price parameters
        const normalizedParams = {
            ...params,
            minPrice: normalizePrice(params.minPrice),
            maxPrice: normalizePrice(params.maxPrice)
        };
        
        // Use the search endpoint if search parameter is provided
        if (params.search) {
            url = `${BASE_URL}/search?q=${encodeURIComponent(params.search)}&limit=${limit}&page=${page}`;
            if (params.sortBy) {
                url += `&sortBy=${params.sortBy}`;
            }
        }
        // Always use filter endpoint if any filter parameters are provided
        else if (normalizedParams.brand || normalizedParams.model || normalizedParams.minPrice || normalizedParams.maxPrice || 
            normalizedParams.color || normalizedParams.fuelType || normalizedParams.transmission) {
            
            url = `${BASE_URL}/filter`;
            const queryParams = [];
            
            if (normalizedParams.brand) queryParams.push(`brand=${encodeURIComponent(normalizedParams.brand)}`);
            if (normalizedParams.model) queryParams.push(`model=${encodeURIComponent(normalizedParams.model)}`);
            if (normalizedParams.minPrice) queryParams.push(`minPrice=${normalizedParams.minPrice}`);
            if (normalizedParams.maxPrice) queryParams.push(`maxPrice=${normalizedParams.maxPrice}`);
            if (normalizedParams.color) queryParams.push(`color=${encodeURIComponent(normalizedParams.color)}`);
            if (normalizedParams.fuelType) queryParams.push(`fuelType=${encodeURIComponent(normalizedParams.fuelType)}`);
            if (normalizedParams.transmission) queryParams.push(`transmission=${encodeURIComponent(normalizedParams.transmission)}`);
            
            // Add limit and page parameters for pagination
            queryParams.push(`limit=${limit}`);
            queryParams.push(`page=${page}`);
            
            // Add sortBy parameter if present
            if (params.sortBy) {
                queryParams.push(`sortBy=${params.sortBy}`);
            }
            
            if (queryParams.length > 0) {
                url = `${url}?${queryParams.join('&')}`;
            }
        } else {
            // For base URL, add pagination and sort
            url = `${url}?limit=${limit}&page=${page}`;
            if (params.sortBy) {
                url += `&sortBy=${params.sortBy}`;
            }
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        return data; // Now returns { total, page, limit, results }
    } catch (error) {
        console.error("Error fetching car inventory:", error);
        throw error;
    }
};

/**
 * Format car information into a readable string
 * @param {Object} car - Car information object
 * @returns {String} - Formatted car information
 */
const formatCarInfo = (car) => {
    return `${car.year} ${car.brand} ${car.model}
  • Color: ${car.color}
  • Price: ₹${car.price.toLocaleString()}
  • Fuel Type: ${car.fuelType}
  • Transmission: ${car.transmission}
  • Seats: ${car.seats}`;
};

/**
 * Compare multiple cars side by side
 * @param {Array} cars - Array of car objects to compare
 * @returns {String} - Formatted comparison table
 */
const compareCarsSideBySide = (cars) => {
    if (cars.length < 2) return "Need at least 2 cars to compare";
    
    // Create header with car names
    let comparison = "| Feature | " + cars.map(car => `${car.year} ${car.brand} ${car.model}`).join(" | ") + " |\n";
    // Add separator
    comparison += "|" + "-".repeat(10) + "|" + cars.map(() => "-".repeat(20)).join("|") + "|\n";
    
    // Add rows for each feature
    comparison += `| Price | ${cars.map(car => `₹${car.price.toLocaleString()}`).join(" | ")} |\n`;
    comparison += `| Color | ${cars.map(car => car.color).join(" | ")} |\n`;
    comparison += `| Fuel Type | ${cars.map(car => car.fuelType).join(" | ")} |\n`;
    comparison += `| Transmission | ${cars.map(car => car.transmission).join(" | ")} |\n`;
    comparison += `| Seats | ${cars.map(car => car.seats).join(" | ")} |\n`;
    
    return comparison;
};

/**
 * Get cars for comparison based on specific models
 * @param {Array} models - Array of model names to compare
 * @returns {Promise<Array>} - Array of car objects matching the models
 */
const getCarsForComparison = async (models) => {
    try {
        // Make individual requests for each model
        const carPromises = models.map(model => 
            fetch(`${BASE_URL}/filter?model=${encodeURIComponent(model)}&limit=1`)
                .then(response => {
                    if (!response.ok) throw new Error(`API request failed for ${model}`);
                    return response.json();
                })
                .then(data => data.results && data.results.length > 0 ? data.results[0] : null)
        );
        
        // Wait for all requests to complete
        const cars = await Promise.all(carPromises);
        return cars.filter(car => car !== null); // Filter out any null results
    } catch (error) {
        console.error("Error fetching cars for comparison:", error);
        throw error;
    }
};

/**
 * Process natural language search query to extract parameters
 * @param {string} query - User's search query
 * @returns {Object} - Extracted parameters
 */
const processNaturalLanguageQuery = (query) => {
    if (!query) return {};
    
    const queryLower = query.toLowerCase();
    const params = {};
    
    // Extract brand
    const brandPatterns = [
        /(toyota|honda|bmw|mercedes|audi|maruti suzuki|maruti|hyundai|tata|mahindra|kia|renault|volkswagen|vw|ford|nissan|skoda|mg)/i
    ];
    
    for (const pattern of brandPatterns) {
        const match = queryLower.match(pattern);
        if (match) {
            params.brand = match[1];
            break;
        }
    }
    
    // Handle make as synonym for brand
    if (!params.brand && queryLower.includes('make')) {
        // Check if asking about another make
        const makeMatch = queryLower.match(/(other|another|different)\s+(make|brand)/i);
        if (makeMatch && conversationalContext.lastBrand) {
            // User wants a different brand than the last one
            params.notBrand = conversationalContext.lastBrand;
        }
    }
    
    // Extract price constraints
    if (queryLower.includes('under')) {
        const underMatch = queryLower.match(/under\s+([₹]?[0-9,.]+)/i);
        if (underMatch) {
            params.maxPrice = underMatch[1];
        }
    }
    
    if (queryLower.includes('above') || queryLower.includes('over')) {
        const overMatch = queryLower.match(/(above|over)\s+([₹]?[0-9,.]+)/i);
        if (overMatch) {
            params.minPrice = overMatch[2];
        }
    }
    
    if (queryLower.includes('between')) {
        const betweenMatch = queryLower.match(/between\s+([₹]?[0-9,.]+)\s+and\s+([₹]?[0-9,.]+)/i);
        if (betweenMatch) {
            params.minPrice = betweenMatch[1];
            params.maxPrice = betweenMatch[2];
        }
    }
    
    // Handle price-related terms - including common typos like "chipest" for "cheapest"
    const cheapestPattern = /\b(cheap|cheapest|cheepest|chipest|cheep|cheapst|affordable|inexpensive|budget|low[- ]cost|low[- ]price|cost-effective|economical)\b/i;
    const expensivePattern = /\b(expensive|pricey|premium|luxury|high[- ]end|top[- ]end|costly)\b/i;
    
    const hasCheapestTerm = cheapestPattern.test(queryLower);
    const hasExpensiveTerm = expensivePattern.test(queryLower);
    
    if (hasCheapestTerm || hasExpensiveTerm) {
        if (hasCheapestTerm) {
            params.sortBy = 'price-asc';
            // If it's just "cheapest" or a similar term alone, show just one result
            if (queryLower.match(/^\s*(the\s+)?(cheapest|cheepest|chipest|cheep|cheapst)\s*$/i)) {
                params.limit = 1;
            } else {
                params.limit = 5;
            }
        } else if (hasExpensiveTerm) {
            params.sortBy = 'price-desc';
            // If it's just "most expensive" or similar term alone, show just one result
            if (queryLower.match(/^\s*(the\s+)?(most\s+)?(expensive|pricey|premium|luxury)\s*$/i)) {
                params.limit = 1;
            } else {
                params.limit = 5;
            }
        }
    }
    
    // Extract color
    const colorMatch = queryLower.match(/(red|blue|black|white|silver|gray|grey|green|yellow|orange|purple|brown|golden|maroon)/i);
    if (colorMatch) {
        params.color = colorMatch[1];
    }
    
    // Extract fuel type
    const fuelMatch = queryLower.match(/(petrol|diesel|electric|hybrid|cng)/i);
    if (fuelMatch) {
        params.fuelType = fuelMatch[1];
    }
    
    // Extract transmission
    const transmissionMatch = queryLower.match(/(automatic|manual)/i);
    if (transmissionMatch) {
        params.transmission = transmissionMatch[1];
    }
    
    // Handle references to previous search contexts
    if ((queryLower.includes("same price") || queryLower.includes("this price range") || 
         queryLower.includes("that price") || queryLower.includes("same range") || 
         queryLower.includes("similar price")) && 
        (conversationalContext.lastPriceRange || (conversationalContext.lastResults && conversationalContext.lastResults.avg))) {
        
        // First try to use explicit price range if available
        if (conversationalContext.lastPriceRange) {
            params.minPrice = conversationalContext.lastPriceRange.min;
            params.maxPrice = conversationalContext.lastPriceRange.max;
        } 
        // If no explicit range, use the price range from last results
        else if (conversationalContext.lastResults && conversationalContext.lastResults.avg) {
            const avgPrice = conversationalContext.lastResults.avg;
            // Create a range around the average price of the previous results (±30%)
            params.minPrice = Math.round(avgPrice * 0.7);
            params.maxPrice = Math.round(avgPrice * 1.3);
        }
    }
    
    // Special handling for "any other brand/make" queries 
    const otherBrandPattern = /\b(other|another|different)\s+(brand|make|manufacturer|car)\b/i;
    const anyOtherBrandMatch = queryLower.match(otherBrandPattern);
    
    if (anyOtherBrandMatch && conversationalContext.lastBrand) {
        // Explicitly exclude last brand
        params.notBrand = conversationalContext.lastBrand;
        
        // If query also mentions "same price range", make sure price range is set
        if ((queryLower.includes("same price") || queryLower.includes("same range")) && 
            !params.minPrice && !params.maxPrice) {
            
            // Use last explicit price range if available
            if (conversationalContext.lastPriceRange) {
                params.minPrice = conversationalContext.lastPriceRange.min;
                params.maxPrice = conversationalContext.lastPriceRange.max;
            }
            // Otherwise use last results to infer a price range
            else if (conversationalContext.lastResults && conversationalContext.lastResults.avg) {
                const avgPrice = conversationalContext.lastResults.avg;
                params.minPrice = Math.round(avgPrice * 0.7);  // 30% below average
                params.maxPrice = Math.round(avgPrice * 1.3);  // 30% above average  
            }
        }
    }
    
    return params;
};

/**
 * Calculate price statistics from car results
 * @param {Array} cars - Array of car objects
 * @returns {Object} - Object with min, max, and avg prices
 */
const calculatePriceStats = (cars) => {
    if (!cars || !cars.length) return { min: null, max: null, avg: null };
    
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let sum = 0;
    
    for (const car of cars) {
        if (car.price < minPrice) minPrice = car.price;
        if (car.price > maxPrice) maxPrice = car.price;
        sum += car.price;
    }
    
    return {
        min: minPrice === Infinity ? null : minPrice,
        max: maxPrice === -Infinity ? null : maxPrice,
        avg: cars.length ? Math.round(sum / cars.length) : null
    };
};

export const carInventoryTool = [
    "carInventory",
    "Search our vehicle inventory by specific attributes: brand (Toyota, Honda, etc.), model (Camry, Civic), price range (in ₹), color (red, blue, white), fuel type (petrol, diesel, electric), or transmission (automatic, manual). Examples of queries: 'show 5 red Honda cars', 'cars under ₹10,00,000', 'compare Toyota Camry and Honda Civic', 'next 10 cars', 'all blue Toyota models', or 'search for family cars'. All prices are in Indian Rupees (₹). For large results, only a limited number will be shown - ask for 'next' or 'more' to see additional cars.",
    {
        brand: z.string().optional().describe("Car brand name like Toyota, Honda, Maruti Suzuki, Hyundai, Tata, Mahindra, etc."),
        model: z.string().optional().describe("Car model like Camry, Civic, Swift, i20, Tiago, Thar, etc."),
        minPrice: z.union([z.number(), z.string()]).optional().describe("Minimum price in INR (₹) - can use formats like 500000, '5,00,000', '₹5 lakh'"),
        maxPrice: z.union([z.number(), z.string()]).optional().describe("Maximum price in INR (₹) - can use formats like 1000000, '10,00,000', 'under 10 lakh'"),
        color: z.string().optional().describe("Car color - red, blue, white, black, silver, gray, etc."),
        fuelType: z.string().optional().describe("Fuel type - Petrol, Diesel, Electric, etc."),
        transmission: z.string().optional().describe("Transmission type - Automatic or Manual"),
        limit: z.number().optional().default(5).describe("Maximum number of results to return (default: 5, max: 10)"),
        page: z.number().optional().default(1).describe("Page number for pagination (starts at 1)"),
        compareModels: z.array(z.string()).optional().describe("List of specific car models to compare"),
        sortBy: z.enum(['price-asc', 'price-desc', 'year-asc', 'year-desc']).optional().describe("Sort results by: price-asc (lowest price first), price-desc (highest price first), year-asc (oldest first), year-desc (newest first)"),
        search: z.string().optional().describe("General search term to find cars across all attributes")
    },    async (args) => {
        try {
            // Handle car comparison if specified
            if (args.compareModels && args.compareModels.length > 1) {
                // Reset last search context for new search
                lastSearchContext = {
                    brand: null,
                    model: null,
                    minPrice: null,
                    maxPrice: null,
                    color: null,
                    fuelType: null,
                    transmission: null,
                    search: null,
                    sortBy: null,
                    limit: 5
                };
                
                const carsToCompare = await getCarsForComparison(args.compareModels);
                
                if (carsToCompare.length < 2) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Could not find enough cars to compare. Please check the model names and try again."
                            }
                        ]
                    };
                }
                
                const comparisonResult = compareCarsSideBySide(carsToCompare);
                return {
                    content: [
                        {
                            type: "text",
                            text: `# Car Comparison\n\n${comparisonResult}`
                        }
                    ]
                };
            }
              // Process natural language in search field
            if (args.search) {
                // Handle price-focused queries
                const isPriceQuery = /\b(cheap|cheapest|affordable|inexpensive|price|cost|expensive|luxury)\b/i.test(args.search.toLowerCase());
                const brandSearchPattern = /(show|find|get|list)?\s*(me|all)?\s*(the)?\s*(bmw|toyota|honda|maruti|hyundai|tata|mahindra|audi|mercedes|kia|ford|renault|volkswagen|vw|skoda|mg)\s*(cars|vehicles|models|automobile)?/i;
                const simpleBrandMatch = args.search.match(brandSearchPattern);
                
                if (simpleBrandMatch) {
                    args.brand = simpleBrandMatch[4]; // The brand name is in capture group 4
                    args.search = null; // Clear search to use specific filters
                    
                    // Check for cheapest/most expensive qualifiers
                    if (/\b(cheap|cheapest|affordable|inexpensive|budget|low[- ]cost)\b/i.test(args.search.toLowerCase())) {
                        args.sortBy = 'price-asc';
                        args.limit = 1; // Show only the cheapest option
                    } else if (/\b(expensive|priciest|luxury|premium)\b/i.test(args.search.toLowerCase())) {
                        args.sortBy = 'price-desc';
                        args.limit = 1; // Show only the most expensive option
                    }
                } else {
                    // Process natural language query
                    const extractedParams = processNaturalLanguageQuery(args.search);
                    
                    // Merge extracted parameters with provided ones (prioritize explicitly provided params)
                    for (const [key, value] of Object.entries(extractedParams)) {
                        // Only apply if the user didn't explicitly provide this parameter
                        if (!args[key]) {
                            args[key] = value;
                        }
                    }
                    
                    // Special handling for "same price range" with brand changes
                    const searchLower = args.search.toLowerCase();
                    if ((searchLower.includes("same price") || 
                        searchLower.includes("this price") || 
                        searchLower.includes("same range") ||
                        searchLower.includes("similar price")) && 
                        (conversationalContext.lastPriceRange || conversationalContext.lastResults.avg)) {
                        
                        // Determine if we're also changing brands
                        const isBrandChange = extractedParams.brand && conversationalContext.lastBrand && 
                                            extractedParams.brand.toLowerCase() !== conversationalContext.lastBrand.toLowerCase();
                        
                        if (isBrandChange || searchLower.includes("other brand") || searchLower.includes("different brand")) {
                            // Brand change with same price range 
                            if (conversationalContext.lastPriceRange) {
                                args.minPrice = conversationalContext.lastPriceRange.min;
                                args.maxPrice = conversationalContext.lastPriceRange.max;
                            } else if (conversationalContext.lastResults.avg) {
                                // Use stats from last results
                                const avgPrice = conversationalContext.lastResults.avg;
                                args.minPrice = Math.round(avgPrice * 0.7);  // 30% below average
                                args.maxPrice = Math.round(avgPrice * 1.3);  // 30% above average
                            }
                            
                            if (args.notBrand && conversationalContext.lastBrand) {
                                // Exclude the previous brand if notBrand is set
                                args.notBrand = conversationalContext.lastBrand;
                            }
                            
                            args.search = null; // Clear search to use specific filters
                        }
                    }
                }
                
                // Handle price-focused queries without explicit brand or just "cheapest" query
                if ((isPriceQuery && !args.brand) || args.search?.toLowerCase() === "cheapest") {
                    if (conversationalContext.lastBrand) {
                        args.brand = conversationalContext.lastBrand;
                        args.sortBy = 'price-asc';
                        args.limit = 1;
                        args.search = null;
                    }
                }
            }
              // Special handling for pagination requests ("next", "next page", etc.)
            // First check if this is an explicit "next" request without other filters
            const isNextRequest = !args.brand && !args.model && !args.minPrice && !args.maxPrice && 
                !args.color && !args.fuelType && !args.transmission &&
                !args.compareModels && !args.search && 
                (!args.page || args.page === 1);  // Default page is 1
            
            // Additional check for explicit page parameter
            const isExplicitPage = args.page && args.page > 1;
                
            // Prepare filter parameters
            let filterParams;
            
            if (isNextRequest || isExplicitPage) {
                // Use previous search context
                filterParams = { ...lastSearchContext };
                
                if (isExplicitPage) {
                    // User explicitly specified a page number
                    filterParams.page = args.page;
                } else {
                    // Increment page for "next" requests
                    filterParams.page = (lastSearchContext.page || 1) + 1;
                }
                
                // If a limit was specified in this request, use it
                if (typeof args.limit === 'number') {
                    filterParams.limit = args.limit;
                    lastSearchContext.limit = args.limit;
                }
            } else {
                // This is a new search, prepare the context
                filterParams = { ...args };
            }
            
            // Store price range information for future reference
            if (filterParams.minPrice || filterParams.maxPrice) {
                conversationalContext.lastPriceRange = {
                    min: filterParams.minPrice,
                    max: filterParams.maxPrice
                };
            }
            
            // Store brand for future reference
            if (filterParams.brand) {
                conversationalContext.lastBrand = filterParams.brand;
            }
              // Store the last query details in conversational context for reference
            conversationalContext.lastQuery = {
                type: filterParams.brand ? 'brand' : 
                       filterParams.maxPrice ? 'price' : 
                       filterParams.color ? 'color' : 'general',
                value: filterParams.brand || filterParams.maxPrice || filterParams.color || 'cars'
            };
            
            // Make API request with the parameters
            const response = await getCarInventory(filterParams);
            const cars = response.results;
            
            // Extract page and limit safely from the response
            const page = response.page || filterParams.page || 1;
              // Calculate price statistics from results and store them
            if (cars && cars.length > 0) {
                conversationalContext.lastResults = calculatePriceStats(cars);
                
                // Store price range information for future reference if it was a search query
                // that didn't already have explicit price constraints
                if (!conversationalContext.lastPriceRange) {
                    const stats = conversationalContext.lastResults;
                    conversationalContext.lastPriceRange = {
                        min: stats.min * 0.9,  // Slightly expand the range for flexibility
                        max: stats.max * 1.1
                    };
                }
            }
            
            // Update the search context with the correct page
            lastSearchContext = {
                brand: filterParams.brand || null,
                model: filterParams.model || null,
                minPrice: filterParams.minPrice || null,
                maxPrice: filterParams.maxPrice || null,
                color: filterParams.color || null,
                fuelType: filterParams.fuelType || null,
                transmission: filterParams.transmission || null,
                search: filterParams.search || null,
                sortBy: filterParams.sortBy || null,
                limit: typeof filterParams.limit === 'number' ? filterParams.limit : 5,
                page: page
            };
            
            if (!cars || cars.length === 0) {                // Customize message based on what the user was searching for
                let suggestedAction = "";
                
                if (filterParams.brand) {
                    // If they were looking for a specific brand with constraints
                    if (filterParams.maxPrice) {
                        const maxP = normalizePrice(filterParams.maxPrice);
                        
                        if (filterParams.brand.toLowerCase() === 'bmw' || 
                            filterParams.brand.toLowerCase() === 'mercedes' ||
                            filterParams.brand.toLowerCase() === 'audi') {
                            suggestedAction = `We don't have any ${filterParams.brand} vehicles under ₹${maxP?.toLocaleString() || filterParams.maxPrice}. Luxury brands like ${filterParams.brand} typically start at higher price points. 
                            
Consider:
- Increasing your budget to ₹20,00,000+ for ${filterParams.brand}
- Looking at pre-owned ${filterParams.brand} vehicles
- Exploring more affordable brands like Maruti Suzuki, Tata, or Hyundai in this price range`;
                        } else {
                            suggestedAction = `We don't have any ${filterParams.brand} vehicles under ₹${maxP?.toLocaleString() || filterParams.maxPrice}. Try a higher price range or consider other brands like Maruti Suzuki, Tata, or Hyundai in this price range.`;
                        }
                    } else {
                        suggestedAction = `No ${filterParams.brand} vehicles found with your criteria. Try removing some filters or try another brand.`;
                    }
                } else if (filterParams.maxPrice) {
                    const maxP = normalizePrice(filterParams.maxPrice);
                    suggestedAction = `We don't have vehicles under ₹${maxP?.toLocaleString() || filterParams.maxPrice} matching your criteria. Try increasing your budget or modifying your search.`;
                } else {
                    suggestedAction = "No cars found matching your criteria. Try adjusting your filters or providing less specific requirements.";
                }
                
                return {
                    content: [
                        {
                            type: "text",
                            text: suggestedAction
                        }
                    ]
                };
            }
            
            // Format results
            const carInfoList = cars.map(formatCarInfo);
            const displayedCars = cars.length;
            
            // Create a more descriptive response
            let responseDescription = "Found";
            
            // Reference the actual filter parameters being used
            if (filterParams.search) responseDescription += ` cars matching "${filterParams.search}"`;
            else {
                if (filterParams.color) responseDescription += ` ${filterParams.color} colored`;
                if (filterParams.brand) responseDescription += ` ${filterParams.brand}`;
                if (filterParams.model) responseDescription += ` ${filterParams.model}`;
                if (filterParams.fuelType) responseDescription += ` ${filterParams.fuelType}`;
                if (filterParams.transmission) responseDescription += ` ${filterParams.transmission}`;
                
                if (filterParams.minPrice && filterParams.maxPrice) {
                    const minP = normalizePrice(filterParams.minPrice);
                    const maxP = normalizePrice(filterParams.maxPrice);
                    responseDescription += ` cars priced between ₹${minP ? minP.toLocaleString() : ''} and ₹${maxP ? maxP.toLocaleString() : ''}`;
                } else if (filterParams.minPrice) {
                    const minP = normalizePrice(filterParams.minPrice);
                    responseDescription += ` cars with price above ₹${minP ? minP.toLocaleString() : ''}`;
                } else if (filterParams.maxPrice) {
                    const maxP = normalizePrice(filterParams.maxPrice);
                    responseDescription += ` cars with price below ₹${maxP ? maxP.toLocaleString() : ''}`;
                } else {
                    responseDescription += ` cars`;
                }
            }
              // Provide pagination information
            let resultText = `${responseDescription}`;
            const pageSize = filterParams.limit || 5;
            const totalPages = Math.ceil(response.total / pageSize);
            
            if (response.total > displayedCars) {
                resultText += ` (${response.total} total, page ${page} of ${totalPages}, showing ${displayedCars}):\n\n`;
            } else {
                resultText += ` (${response.total} result${response.total !== 1 ? 's' : ''}):\n\n`;
            }
            
            resultText += carInfoList.join('\n\n');
              // Add pagination guidance
            if (response.total > page * pageSize) {
                resultText += `\n\n---\nShowing page ${page} of ${totalPages}. `;
                resultText += `For more results with the same filters, ask for "next page" or "page ${page + 1}".`;
            } else if (page > 1) {
                resultText += `\n\n---\nEnd of results. You've viewed all ${response.total} cars matching your criteria.`;
            } else if (response.total > pageSize && response.total <= 10) {                resultText += `\n\n---\nTo see all ${response.total} results at once, ask for "show all ${response.total} cars".`;
            }
            
            return {
                content: [
                    {
                        type: "text",
                        text: resultText
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching car inventory: ${error.message}`
                    }
                ]
            };
        }
    }
];
