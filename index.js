const express = require('express')
const app = express()
const http = require("http").createServer(app)

const bodyParser = require('body-parser');
const multer = require("multer")
require("dotenv").config()

const expressBasicAuth = require("express-basic-auth")


const {S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand} = require("@aws-sdk/client-s3")


const REGION = "us-west-004"

const b2 = new S3Client({
    endpoint: `https://s3.${REGION}.backblazeb2.com`,
    region: REGION,
    credentials: {
      // Must have both read and write permissions on BUCKET_NAME
      accessKeyId: process.env.APPKEYID,
      secretAccessKey: process.env.APPKEY,
    },
})

var cors = require('cors')
const upload = multer({})

app.use(cors())
app.use(bodyParser.json())

app.set("views", "./views")
app.set("view engine", "ejs")

const streamToString = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });


app.get('/uploads/:fileName', async (req,res) => {
  let filename = req.params.fileName

  try {
    const resp = await b2.send(new GetObjectCommand({
      Bucket: "TheNest",
      Key: filename,
    }))
    res.type(resp.ContentType)
    resp.Body.pipe(res)
  } catch (error) {
    if(error.code == "NoSuchKey") {
      res.status(404).end()
    } else {
      console.error(error)
      res.status(500).end()
    }
  }
})

 

app.post("/upload", upload.single("thefile"), async (req, res) => {

  const {file} = req

  if(!file) return res.status(400).send({
    message: "File wasn't found!"
  })
  await b2.send(
    new PutObjectCommand({
      Bucket: "TheNest",
      Key: file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  )
  res.status(200).send({
    url: `https://${req.hostname}/uploads/${file.originalname}`
  })
})

app.get("/", (req, res) => {
    res.redirect("/upload")
})

app.get("/upload", (req,res) => {
  res.sendFile(__dirname+"/views/upload.html")
})

app.get("/uploads", expressBasicAuth({
  users: {
    cappy: "cinno"
  },
  challenge: true,
  unauthorizedResponse: (req) => {
    return "Authorization is required!"
  }
}), async (req, res) => {
  const resp = await b2.send(new ListObjectsCommand({
    Bucket: "TheNest",
    Delimiter: "/",
  }))
  res.send(resp.Contents)
})




// /////////////////////////////////////////////////////////////////////////////
// Catch all handler for all other request.
app.use('*', (req,res) => {
  res.sendStatus(404).end()
})







// /////////////////////////////////////////////////////////////////////////////
// Start the server
const port = process.env.PORT || 5000
http.listen(port, () => {
  console.log(`index.js listening at http://localhost:${port}`)
})