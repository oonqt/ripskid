const mongoose = require("mongoose");
const Discord = require("discord.js");
const fs = require("fs");
const config = require("./config.json");
require("dotenv").config();

const client = new Discord.Client();
client.commands = new Discord.Collection();
client.cooldown = new Set();
mongoose.connect(config.dbconn, { useNewUrlParser: true }, () => console.log("MongoDB Connection established to", config.dbconn));

client.on("ready", () => {
  console.log("Logged in as", client.user.tag);
  if(client.guilds.size > 1) {
    console.log("Security vulnerability: bot is in more than one guild. Shutting down.");
    process.exit(1);
  } else {
    console.log("Bot is secure");
  }
  client.user.setActivity("People sharing keys", { type: "WATCHING" });
  client.logChannel = client.channels.find(channel => channel.name === config.logChannel);
});

client.on("messageDelete", message => {
  if(message.author.id === client.user.id) return;
  let logEmbed = new Discord.RichEmbed()
    .setTitle("Message Deleted")
    .setColor("RANDOM")
    .setDescription(`By ${message.author.tag}`)
    .addField("Content", (message.embeds.length > 0) ? "unable to display(embed)" : message.content)
    .setTimestamp();
  client.logChannel.send(logEmbed);
});

client.on("guildMemberAdd", member => {
  let retard = client.guilds.get(config.mainGuild).roles.find(role => role.name === config.joinRole);
  member.addRole(retard);
});

client.on("message", async message => {
  if(message.author.bot) return;

  let messageArray = message.content.split(" ");
  let command = messageArray[0];
  let args = messageArray.slice(1);
  let prefix = config.prefix;
  let cooldownEmbed = new Discord.RichEmbed().setTitle("Cooldown").setColor("#00FF00").setDescription("You have to wait 3 seconds between command execution!").setTimestamp();

  if(client.cooldown.has(message.author.id)) {
    message.channel.send(cooldownEmbed);
  } else {
    let cFile = client.commands.get(command.slice(prefix.length));
    if(cFile) {
      if(cFile.help.elevated === true && !config.owners.includes(message.author.id)) return;
      cFile.run(client, Discord, message, args);
      if(!config.owners.includes(message.author.id)) {
        client.cooldown.add(message.author.id);
      }
    } 

    setTimeout(() => {
      client.cooldown.delete(message.author.id);
    }, config.cdseconds * 1000);
  }
});

fs.readdir("./commands/", (err, files) => {
  if(files.length < 1) return console.error("No commands");

  let jsFiles = files.filter(f => f.split(".").pop() === "js");

  jsFiles.forEach(file => {
    let module = require(`./commands/${file}`);
    client.commands.set(module.help.name, module);
    if(module.help.aliases) {
      module.help.aliases.forEach(alias => {
        client.commands.set(alias, module);
      });
    }
    console.log("Loaded", file);
  });
});

client.login(process.env.TOKEN);