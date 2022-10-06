const redis = require("redis");
const crypto = require("node:crypto");
const database = require("./db");
const Produto = require("./produto");
require("dotenv").config();

const queue = [];
const clientId = crypto.randomUUID();

const printQueue = () => {
  const pos = queue.indexOf(clientId);
  if (pos != -1)
    console.log("\x1b[33m%s%s%s\x1b[0m", "My position is ", pos + 1, "°");
  console.log("\x1b[31m%s\x1b[0m:", "Current queue:");
  console.log(queue);
};

(async () => {
  const resultado = await database.sync();

  const subscriber = redis.createClient({
    socket: { host: "containers-us-west-39.railway.app", port: 7369 },
    password: "gBsfV4qEBihL8i2iVIlr",
  });
  const publisher = subscriber.duplicate();

  await subscriber.connect();
  await publisher.connect();

  subscriber.on("error", (err) => {
    console.log("Error " + err);
  });

  publisher.on("error", (err) => {
    console.log("Error " + err);
  });

  console.log("\x1b[35m%s\x1b[0m", "I am " + clientId);

  await subscriber.subscribe("queue", async (message) => {
    console.log("\n\x1b[36m%s\x1b[0m: \x1b[32m%s\x1b[0m", "Recived", message);

    const json = JSON.parse(message);

    if (json.command == "aquire") {
      console.log(
        "\n\x1b[34m%s\x1b[0m\x1b[33m%s\x1b[0m\x1b[34m%s\x1b[0m",
        "Adding ",
        json.id,
        " to queue..."
      );
      queue.push(json.id);
      printQueue();
    } else if (json.command == "release") {
      console.log(
        "\n\x1b[31m%s\x1b[0m\x1b[33m%s\x1b[0m\x1b[31m%s\x1b[0m",
        "Removing ",
        json.id,
        " from queue..."
      );
      queue.shift();
      printQueue();
    } else if (json.command == "current" && json.id == clientId) {
      console.log("\n\x1b[35m%s\x1b[0m\x1b", "Recived the current queue...");
      queue.push(...json.queue);
      printQueue();
    } else if (
      json.command == "sync" &&
      queue[0] == clientId &&
      json.id != clientId
    ) {
      console.log(
        "\n\x1b[35m%s\x1b[0m\x1b[33m%s\x1b[0m\x1b[35m%s\x1b[0m",
        "The ",
        json.id,
        " asked for sync..."
      );
      const current = {
        id: json.id,
        command: "current",
        queue,
      };
      await publisher.publish("queue", JSON.stringify(current));
    }

    if (queue[0] == clientId) {
      setTimeout(async () => {
        console.log("\n\x1b[35m");
        await Produto.create({
          nome: "mouse",
          preco: 10,
          descricao: "Um mouse USB bonitão",
        });
        console.log("\n\x1b[0m");
        const release = {
          id: json.id,
          command: "release",
        };
        await publisher.publish("queue", JSON.stringify(release));
      }, Math.floor(Math.random() * 30000) + 10000);
    }
  });

  const sync = {
    id: clientId,
    command: "sync",
  };

  await publisher.publish("queue", JSON.stringify(sync));

  const aquire = {
    id: clientId,
    command: "aquire",
  };

  setInterval(async () => {
    await publisher.publish("queue", JSON.stringify(aquire));
  }, Math.floor(Math.random() * 10000) + 5000);
})();
