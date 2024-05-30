const express = require('express');
const fs = require('fs');

const app = express();
const port = 3003;

const data = fs.readFileSync('./target/idl/unlimited_auction.json');
const jsonData = JSON.parse(data);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Credentials', true);
    if (req.method === 'OPTIONS') {
        res.header(
            'Access-Control-Allow-Methods',
            'PUT, POST, PATCH, DELETE, GET'
        );
        return res.status(200).json({});
    }
    next();
});

app.get('/program', (req, res) => {
    res.json(jsonData);
});

app.get('/program', (req, res) => {
    const property = req.params.property;
    if (jsonData.hasOwnProperty(property)) {
        res.json(jsonData[property]);
    } else {
        res.status(404).json({ error: 'Program not found' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
