const http = require('http');
const express = require('express');
const app = express();
const path = require('path');
const portNumber = 5000;
const bodyParser = require("body-parser");
const axios = require('axios');

let currUser;

require("dotenv").config({ path: path.resolve(__dirname, 'env/.env') })

const uri = "mongodb+srv://dzheng2004:04252004.@cluster0.wfaq2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const databaseAndCollection = {db: "CMSC335DB", collection: "pokeUsers"};
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(express.static(path.join(__dirname, 'public')));

app.set("views", path.resolve(__dirname, "templates"));

app.set("view engine", "ejs");

app.get("/", (req, res) => {   
    res.render("index", {error: ""});
});

app.use(bodyParser.urlencoded({extended:false}));

function rollPokemon() {
    return Math.floor(Math.random() * 898) + 1;
}

// Checks if the username entered exists, if it exists checks it password. If password does not match, redirect to the login. If username does not exist, create a new account
app.post("/welcome", async (req, res) => {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    
    try {
        let {user, pass} = req.body;
        let filter = {username: user}
        const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
    
        const variables = {
            name: user,
        };

        if (result) {
            if (result.password == pass) {
                currUser = result;
                res.render("welcome", variables)
            } else {
                res.render("index", {error: `Wrong password for user ${user}. Please re-enter password.`});
            }
        } else {
            let pokeUser = {username: user, password: pass, pokemons: []};
            await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(pokeUser);
            let filter = {username: user}
            const result = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .findOne(filter);
            currUser = result;
            res.render("welcome", variables);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/welcome", (req, res) => {
    const variables = {
        name: currUser.username,
    };
    res.render("welcome", variables);
});

// rolls for a random pokemon and adds that pokemon to the currUser's list of pokemons in the database
app.get("/gacha", async(req, res) => {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        let pokemon_id = rollPokemon();
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon_id}/`);
        const spriteUrl = response.data.sprites.front_default;
        const name = response.data.name;
        const variables = {
            pokemon: name,
            spriteUrl: spriteUrl,
        }
        await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).updateOne(
            { username: currUser.username },
            { $push: { pokemons: name } } 
        );
        res.render("gacha", variables)
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});


const webServer = http.createServer(app);
webServer.listen(portNumber, () => {
    console.log(`Web server is running at http://localhost:${portNumber}`);
});

process.stdin.setEncoding("utf8");

// the server runs until stop is entered in the terminal
const prompt = "Stop to shudown the server: "
process.stdout.write(prompt);
process.stdin.on('readable', () => {
    const input = process.stdin.read();
    if (input !== null) {
        const command = input.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log('Invalid command: ${command}');
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
})
