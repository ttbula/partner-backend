require('dotenv').config()

const { PORT = 4000, MONGODB_URI } = process.env
const express = require("express")
const { MongoClient } = require('mongodb')
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const bcrypt = require('bcrypt')
// const { MongoClient } = require
const app = express();

app.use(cors())
app.use(express.json())

//db connection
mongoose.connect(MONGODB_URI);
mongoose.connection
  .on("open", () => console.log("Connected to Mongoose"))
  .on("close", () => console.log("Disconnected"))
  .on("error", (error) => console.log(error))


app.get('/', (req,res) => {
    res.json('hello')
})

// app.post('/createaccount', async (req, res) => {
//     const client = new MongoClient(MONGODB_URI)
//     const { email, password } = req.body

//     const generateUserId = uuidv4()
//     const hashedpassword = await bcrypt.hash(password, 10)

//     try {
//         await client.connect()
//         const database = client.db('partner-data')
//         const users = database.collection('users')
//         const existingUser = await users.findOne({email})

//         if(existingUser) {
//             return res.status(409).send('User exists. Try to login.')
//         }

//         const lower = email.toLowerCase()
//         const data = {
//             user_id: generateUserId,
//             email: lower,
//             hashed_password: hashedpassword
//         }
//         const insertUser = users.insertOne(data)
//         const token = jwt.sign(insertUser, lower, {
//             expiresIn: 60 * 24

//         })

//         res.status(201).json({ token, userId: generateUserId})

//     } catch (error) {
//         res.status(400).json(error);
//     } finally {
//         await client.close()
//     }

// })

app.post('/signup', async (req, res) => {
    const client = new MongoClient(MONGODB_URI)
    const {email, password} = req.body

    const generatedUserId = uuidv4()
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')

        const existingUser = await users.findOne({email})

        if (existingUser) {
            return res.status(409).send('User already exists. Please login')
        }

        const sanitizedEmail = email.toLowerCase()

        const data = {
            user_id: generatedUserId,
            email: sanitizedEmail,
            hashed_password: hashedPassword
        }

        const insertedUser = await users.insertOne(data)

        const token = jwt.sign(insertedUser, sanitizedEmail, {
            expiresIn: 60 * 24
        })
        res.status(201).json({token, userId: generatedUserId})

    } catch (err) {
        console.log(err)
    } finally {
        await client.close()
    }
})


app.get('/users', async (req,res) => {
    const client = new MongoClient(MONGODB_URI)

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')
        const returnedUsers = await users.find().toArray()
        res.send(returnedUsers)
    } catch (error) {
        res.status(400).json(error);
    }
})


// listener
app.listen(PORT, () => console.log(`listening on PORT ${PORT}`));