const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Buffer } = require('buffer');

const app = express();
const port = process.env.PORT || 3000;

const customHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
    'xc-token': 'hGuPsKvlQMb4dFsLYfwnpqGdSM6DRRpUNlJaYhWV',

    // Add any other headers as needed
};

app.use(cors());

// Define the route to fetch data from a specified table
app.get('/data/:tableId', fetchData);

// Function to handle creating a new record in the Users table
app.post('/createUser/:tableId', express.json(), createNewUser);
//app.post('/createUser', express.json(), createNewUser);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Function to handle fetching data from NocoDB
async function fetchData(req, res) {
    const tableId = req.params.tableId.toLowerCase();
    try {
        if (tableId) {
            // Make API request to NocoDB
            const response = await axios.get(`https://app.nocodb.com/api/v2/tables/${tableId}/records`, { headers: customHeaders });
            // Edit and transform data
            let data = await editData(response.data);
            // Send the transformed data as JSON response
            res.json(data);
        } else {
            // If table not found, send a JSON response with a relevant error message
            res.status(404).json({ error: 'Table not found' });
        }
    } catch (error) {
        // Handle errors and send a JSON response with a relevant error message
        handleError(res, tableId, error);
    }
}

// Function to handle creating a new record in the Users table
async function createNewUser(req, res) {
    const tableId = req.params.tableId.toLowerCase();
    const userData = req.body; // Assuming the client sends user data in the request body

    try {
        // Make API request to NocoDB to create a new record in the Users table
        const response = await axios.post(`https://app.nocodb.com/api/v2/tables/${tableId}/records`, userData, { headers: customHeaders });

        // Send the response from NocoDB as JSON response
        res.json(response.data);
    } catch (error) {
        // Handle errors and send a JSON response with a relevant error message
        handleError(res, 'Users', error);
    }
}

// Function to edit or transform the data as needed
async function editData(data) {
    // Remove the 'pageInfo' property
    delete data.pageInfo;
    // Convert all URLs to base64
    await convertUrlsToBase64(data);
    return data;
}

// Function to convert URLs to base64
async function convertUrlsToBase64(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            // Check if the value is a string and resembles a URL
            if (typeof value === 'string' && value.startsWith('http') && key == 'signedUrl') {
                // Convert the URL to base64
                obj[key] = await fetchAndConvertToBase64(value, obj['mimetype']);
            } else if (typeof value === 'object' && value !== null) {
                // Recursively traverse nested objects or arrays
                await convertUrlsToBase64(value);
            }
        }
    }
}

// Function to fetch and convert a string to base64
async function fetchAndConvertToBase64(url, mimeType) {
    try {
        // Make API request to fetch data from URL
        const response = await axios.get(url, { responseType: 'arraybuffer', headers: customHeaders });
        // Convert the response data to a Buffer
        const buffer = Buffer.from(response.data, 'binary');
        // Convert the Buffer to base64
        const base64 = buffer.toString('base64');
        // Prepend the MIME type to the base64 data
        const dataWithMimeType = `data:${mimeType};base64,${base64}`;
        return dataWithMimeType;
    } catch (error) {
        // Handle errors and return null
        console.error(`Error fetching or converting data from ${url}:`, error.message);
        return null;
    }
}



// Function to handle errors and send 500 status
function handleError(res, tableId, error) {
    console.error(`Error fetching data from NocoDB for table ${tableId}:`, error.message);
    res.status(500).send('Internal Server Error');
}
