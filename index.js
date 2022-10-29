const express = require('express')
const app = express()
const AWS = require("aws-sdk");
const s3 = new AWS.S3()
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
require("dotenv").config()

const B2 = require('backblaze-b2');

const b2 = new B2({
  applicationKeyId: process.env.APPKEYID, 
  applicationKey: process.env.APPKEY
});


app.use(bodyParser.json())
app.use(fileUpload({
    createParentPath: true
}))

app.set("views", "./views")
app.set("view engine", "ejs")

// curl -i https://some-app.cyclic.app/myFile.txt
app.get('/uploads/:fileName', async (req,res) => {
  let filename = req.params.fileName

  await b2.authorize()


  try {
    let file = await b2.downloadFileByName({
        bucketName: "TheYiffStash",
        fileName: filename,
        responseType: "arraybuffer"
    })
    res.status(200).send(file.data)
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.log(`No such key ${filename}`)
      res.sendStatus(404).end()
    } else {
      console.log(error)
      res.sendStatus(500).end()
    }
  }
})

app.get("/upload", (req, res) => {
    res.render("upload")
})

app.post("/upload", async (req, res) => {
    await b2.authorize()
    const file = req.files.thefile
    if(!file) return res.status(400).send("No file found!")
    const uploadURLData = await b2.getUploadUrl({
        bucketId: process.env.B2_BUCKET
    })
    await b2.uploadFile({
        uploadUrl: uploadURLData.data.uploadUrl,
        uploadAuthToken: uploadURLData.data.authorizationToken,
        fileName: file.name,
        mime: file.mimetype,
        data: file.data
    })
    res.status(200).send({
        url: `https://easy-erin-fawn-ring.cyclic.app/uploads/${file.name}`
    })
})


// curl -i -XPUT --data '{"k1":"value 1", "k2": "value 2"}' -H 'Content-type: application/json' https://some-app.cyclic.app/myFile.txt
app.put('*', async (req,res) => {
  let filename = req.path.slice(1)

  console.log(typeof req.body)

  await s3.putObject({
    Body: JSON.stringify(req.body),
    Bucket: process.env.BUCKET,
    Key: filename,
  }).promise()

  res.set('Content-type', 'text/plain')
  res.send('ok').end()
})

// curl -i -XDELETE https://some-app.cyclic.app/myFile.txt
app.delete('*', async (req,res) => {
  let filename = req.path.slice(1)

  await s3.deleteObject({
    Bucket: process.env.BUCKET,
    Key: filename,
  }).promise()

  res.set('Content-type', 'text/plain')
  res.send('ok').end()
})

// /////////////////////////////////////////////////////////////////////////////
// Catch all handler for all other request.
app.use('*', (req,res) => {
  res.sendStatus(404).end()
})

// /////////////////////////////////////////////////////////////////////////////
// Start the server
const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`index.js listening at http://localhost:${port}`)
})