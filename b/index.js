import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Url from './models/url.js';
import cors from 'cors';
import jwt from 'jwt';
import User from './models/user.js';
import bcrypt, { compare } from 'bcrypt';

; import { setCache, getCache, deleteCache, hasCache, clearCache } from './utils/cache.js';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

const mongodbUrl =
    process.env.MONGODB_URL ||
    'mongodb://localhost:27017/urlshortener';


// MongoDB connection
mongoose.connect(mongodbUrl)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection failed:', error);
    });


// Generate random string
function generateRandomString(length) {

    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let result = '';

    for (let i = 0; i < length; i++) {

        result += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );

    }

    return result;
}
// Generate short URL

function generateShortUrl() {
    const randomString = generateRandomString(6);
    return `http://localhost:3000/${randomString}`;
}

// Normalize URL
function normalizeUrl(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    try {
        return new URL(url).href;
    } catch {
        try {
            return new URL(`http://${url}`).href;
        } catch {
            return null;
        }
    }
}

// Home
app.get('/', (req, res) => {

    res.send('Hello, World!');

});

// Create short URL
app.post('/url', async (req, res) => {

    try {

        const uri = req.body.originalUrl;
        const customShortUrl = req.body.customShortUrl;

        let conatains = await Url.findOne({
            shortUrl: customShortUrl
        });

        const normalizedUrl = normalizeUrl(uri);

        if (!normalizedUrl) {
            return res.status(400).json({
                error: 'Invalid URL'
            });
        }

        let shortUrl = customShortUrl;
        if (conatains) {

            shortUrl = generateShortUrl();
        }
        let checkUrl = await Url.findOne({
            shortUrl: shortUrl
        });

        let urlcount = 5;
        while (checkUrl && urlcount > 0) {

            shortUrl = generateShortUrl();
            checkUrl = await Url.findOne({
                shortUrl: shortUrl
            });
            urlcount--;
        }

        if (checkUrl) {
            return res.status(500).json({
                error: 'Failed to generate unique short URL'
            });
        }

        const url = await Url.create({
            originalUrl: normalizedUrl,
            shortUrl: `http://localhost:3000/${shortUrl}`,
        });

        res.status(201).json(url);

    } catch (error) {

        console.error(error);
        res.status(500).json({
            error: 'Failed to create short URL'
        });
    }
});

app.get('/url/:id', async (req, res) => {

    try {

        // Get ID from URL
        const id = req.params.id;

        // Find document
        const info = await Url.findById(id);


        // Check if document exists
        if (!info) {

            return res.status(404).json({
                error: 'URL not found'
            });

        }


        res.status(200).json({

            id: info._id,

            originalUrl: info.originalUrl,

            shortUrl: info.shortUrl,

            count: info.counter

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Failed to get URL'
        });

    }

});
// Get all URLs
// app.get('/getall', async (req, res) => {

//     try {

//         const urls = await Url.find();

//         res.status(200).json(urls);

//     } catch (error) {

//         console.error(error);

//         res.status(500).json({
//             error: 'Failed to get all URLs'
//         });

//     }

// });

app.get('/getall', async (req, res) => {
    try {

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const sorting = req.query.sorting || 'desc';

        const skip = (page - 1) * limit;

        const [urls, total] = await Promise.all([
            Url.find()
                .sort({ _id: sorting === 'asc' ? 1 : -1 })
                .skip(skip)
                .limit(limit),

            Url.countDocuments()
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            data: urls,
            pagination: {
                currentPage: page,
                limit: limit,
                totalRecords: total,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to get URLs'
        });
    }
});

app.get('/:shortCode', async (req, res) => {
    try {
        const shortCode = req.params.shortCode;
        const shortUrl = `http://localhost:3000/${shortCode}`;

        const cachedUrl = getCache(shortUrl);

        if (cachedUrl) {
            console.log('Cache hit for short URL:', shortUrl);
            cachedUrl.counter++;
            await cachedUrl.save();
            return res.redirect(cachedUrl.originalUrl);
        }

        console.log('Cache miss for short URL:', shortUrl);

        const url = await Url.findOne({
            shortUrl: shortUrl
        });

        if (!url) {
            return res.status(404).json({
                error: 'Short URL not found'
            });
        }

        url.counter++;
        await url.save();
        setCache(shortUrl, url);
        res.redirect(url.originalUrl);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to redirect to original URL'
        });
    }
});

app.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Name, password and email required'
            });
        }

        const existinguser = await User.findOne({ email })

        if (existinguser) {
            return res.status(409).json({
                error: 'User already exists'
            })
        }
        const hashPassword = await bcrypt.hash(password, 10);

        const user = User.create({
            name, email, password: hashPassword
        });

        res.status(201).json({
            message: 'User is register',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Registration failed'
        })

    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { name, email, password } = req.body;


        if (!email || !password) {
            return res.status(400).json({
                error: 'email and password Required'
            })
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            })
        }
        const matchedpassword = await bcrypt.compare(user.password, password);

        if (!matchedpassword) {
            return res.status(401).json({
                error: 'email or password invalid'
            });
        }
        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_TOKEN, { expiresIn: '1h' }
        )

        req.status(200).json({
            message:'Login succesfully',
            token
        });

    } catch {
        res.status(500).json({
            error:'Login failed'                                                                              
        })

    }
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Server is running on port ${PORT}`
    );

});