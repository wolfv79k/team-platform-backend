import express from 'express'

const PORT = process.env.PORT ?? 3000;

const app = express();
app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});
