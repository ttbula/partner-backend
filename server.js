require('dotenv').config()

const { PORT = 4000, MONGODB_URI } = process.env
const express = require("express")
const { MongoClient, ListCollectionsCursor } = require('mongodb')
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const bcrypt = require('bcrypt');
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
            return res.status(409).send('User exists. Proceed to login')
        }

        const lowerEmail = email.toLowerCase()

        const data = {
            user_id: generatedUserId,
            email: lowerEmail,
            hashed_password: hashedPassword
        }

        const insertedUser = await users.insertOne(data)

        const token = jwt.sign(insertedUser, lowerEmail, {
            expiresIn: 60 * 24
        })
        res.status(201).json({token, userId: generatedUserId})

    } catch (err) {
        console.log(err)
    } finally {
        await client.close()
    }
})

app.post('/login', async (req,res) => {
    const client = new MongoClient(MONGODB_URI)
    const { email, password } = req.body

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')
        const user = await users.findOne({ email })
        const rightPassword = await bcrypt.compare(password, user.hashed_password)

        if(user && rightPassword) {
            const token = jwt.sign(user, email, {
                expiresIn: 60 * 24
            })
            res.status(201).json({ token, userId: user.user_id})
        }
        res.status(400).send('invalid credentials')
    } catch (err){
        console.log(err)
    }
})

app.get('/user', async (req,res) => {
    const client = new MongoClient(MONGODB_URI)
    const userId = req.query.userId
    
    // console.log('userId', userId)

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')

        const query = { user_id: userId}
        const user = await users.findOne(query)
        res.send(user)
    } finally {
        await client.close()
    }
})

app.put('/addmatch', async (req, res) => {
    const client = new MongoClient(MONGODB_URI)
    const {userId, matchedUserId} = req.body

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')

        const query = {user_id: userId}
        const updateDocument = {
            $push: {matches: {user_id: matchedUserId}}
        }
        const user = await users.updateOne(query, updateDocument)
        res.send(user)
    } finally {
        await client.close()
    }
})

app.get('/users', async (req,res) => {
    const client = new MongoClient(MONGODB_URI)
    const userIds = JSON.parse(req.query.userIds)

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')

        const pipeline = 
            [
                {
                    '$match': {
                        'user_id': {
                            '$in': userIds
                        }
                    }
                }
            ]
        const foundUsers = await users.aggregate(pipeline).toArray()
        res.send(foundUsers)

    } finally {
        await client.close()
    }
})











app.get('/allusers', async (req,res) => {
    const client = new MongoClient(MONGODB_URI)

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')
        const allUsers= await users.find().toArray()
        res.send(allUsers)
    } catch (error) {
        res.status(400).json(error);
    }
})

app.put('/user', async (req, res) => {
    const client = new MongoClient(MONGODB_URI)
    const formData = req.body.formData

    try {
        await client.connect()
        const database = client.db('partner-data')
        const users = database.collection('users')

        const query = { user_id: formData.user_id}
        const update = {
            $set: {
                first_name: formData.first_name,
                dob_day: formData.dob_day,
                dob_month: formData.dob_month,
                dob_year: formData.dob_year,
                handicap: formData.handicap,
                url: formData.url,
                about: formData.about,
                matches: formData.matches
            },
        }
        const newUser = await users.updateOne(query, update)
        res.send(update)
    } finally {
        await client.close()
    }
})


app.get('/messages', async (req,res) => {
    const { userId, correspondingUserId} = req.query
    const client = new MongoClient(MONGODB_URI)
    try {
        await client.connect()
        const database = client.db('partner-data')
        const messages = database.collection('chat')

         const query = {
             from_userId: userId, to_userId: correspondingUserId
        }

        const foundMessages = await messages.find(query).toArray()
        res.send(foundMessages)
    }finally {
        await client.close()
    }
})



app.post('/message', async (req,res) => {
    const client = new MongoClient(MONGODB_URI)
    const message = req.body.message

    try {
        await client.connect()
        const database = client.db('partner-data')
        const messages = database.collection('chat')
        const insertedMessage = await messages.insertOne(message)
        res.send(insertedMessage)
    } finally {
        await client.close()
    }
})


// listener
app.listen(PORT, () => console.log(`listening on PORT ${PORT}`));