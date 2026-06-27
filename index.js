const dns = require('node:dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const dontenv = require("dotenv");
dontenv.config();

const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGO_URL
const cors = require('cors');
const jose = require('jose-cjs');
const { SignJWT, jwtVerify, generateKeyPair, createRemoteJWKSet } = require('jose-cjs');

app.use(cors());
app.use(express.json())

// if (!uri) {
//     console.error(
//         'MONGO_URL is missing. Create badon_server/.env with MONGO_URL=mongodb://... or mongodb+srv://...'
//     );
//     process.exit(1);
// }

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const myDB = client.db("Demo");

const myCollUser = myDB.collection('user')
const myCollRequest = myDB.collection('A10')
const myCollFund = myDB.collection('Fund_list')
const myColldistrict = myDB.collection('district')
const myCollupazila = myDB.collection('upazila')

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
}




async function run() {
    try {

        await client.connect();
        //all donation request curd
        app.get('/district', async(req,res) => {
            let query = {}
            const {id} = req.query
            if(id){
                query ={
                    id : id
                }
            }
           
            const result = await myColldistrict.find(query).toArray()
            res.send(result)
        })
        app.get('/upazila', async(req,res) => {
            const query = {}
            const result = await myCollupazila.find().toArray()
            res.send(result)
        })
        app.get('/donation_requests', async (req, res) => {
            const {donationStatus,blood,district,upazila} = req.query
            let query = {}
            if(donationStatus) {
                query = {
                    donationStatus : donationStatus
                }
            }
            if(blood !== undefined){
                query.bloodGroup = blood
            }
            if(district !== undefined){
                query.recipientDistrict = district
            }
            if(upazila !== undefined){
                query.recipientUpazila = upazila
            }
            console.log(query)
            const result = await myCollRequest.find(query).toArray()
            console.log(result)
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const query = {}
            const result = await myCollUser.find(query).toArray()
            res.send(result)
        })
        app.get('/fund', async (req, res) => {
            const query = {}
            const result = await myCollFund.find(query).toArray()
            res.send(result)
        })

        app.get('/donation_requests/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = {
                _id: new ObjectId(id)
            }
            const result = await myCollRequest.findOne(query)
            res.send(result)
        })

        app.get('/my-requests', async (req, res) => {
            const { Email } = req.query
            console.log(Email)
            const query = {
                requesterEmail: Email
            }
            const result = await myCollRequest.find(query).limit(3).toArray()
            console.log(result)
            res.send(result)
        })
        //status update
        app.patch('/donation_requests/:id', async (req, res) => {
            const id = req.params.id
            const { donorName, donorEmail,donationstatus } = req.query
            const query = {
                _id: new ObjectId(id)
            }
            const obj = {}
            if(donorName && donorEmail)
            {
                obj.donationStatus = 'In progress'
                obj.donorName = donorName
                obj.donorEmail = donorEmail
            }
            if(donationstatus){
                obj.donationStatus = donationstatus
            }


            const update = {
                $set: obj
            }
            const result = await myCollRequest.updateOne(query, update)
            res.send(result)
        })
        app.patch('/users', async (req, res) => {
            let updatedinfo = {}
            const { status,role,id } = req.query
            if (status) updatedinfo.status = status;
            if (role) updatedinfo.role = role;
            console.log(req.query)
            const query = {
                _id: new ObjectId(id)
            }
            const update = {
                $set: updatedinfo


            }
            const result = await myCollUser.updateOne(query, update)
            res.send(result)
        })

        

        app.patch('/donation_requests', async(req,res) => {
            const objects = JSON.parse(req.query.data)
            const id = req.query.id
            const query = {
                _id  : new ObjectId(id)
            }
            const updated = {
                $set : objects
            }
            const result = await myCollRequest.updateOne(query,updated)
            res.send(result)
        })

        app.post('/dashboard/create-request', async (req, res) => {
            const data = req.body
            const result = await myCollRequest.insertOne(data)
            console.log(result)
            res.send(result)
        })

        app.post('/fund',async(req,res) => {
            const data = req.body
            const result = await myCollFund.insertOne(data)
            res.send(result)
        })

        //

        app.patch('/user/:id', async (req, res) => {
            const bodyId = await req.params.id
            const bodys = req.body
            console.log(bodyId, bodys)
            const query = {
                _id: new ObjectId(bodyId)
            }
            const update = { $set: bodys };
            const result = await myCollUser.updateOne(query, update)
            console.log(result)
            res.send(result)
        })

        app.delete('/donation_requests/:id', async(req,res) => {
            const {id} = req.params
            const query = {
                _id : new ObjectId(id)
            }
            const result = await myCollRequest.deleteOne(query)
            console.log(result)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("Demo").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

