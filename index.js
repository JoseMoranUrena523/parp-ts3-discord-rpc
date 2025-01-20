const { Telnet } = require('telnet-client');
const RPC = require('discord-rpc');
const { ts3ApiKey, robloxUsername } = require('./config.json');

const client = new RPC.Client({ transport: 'ipc' });
const connection = new Telnet();

let startTimestamp = Date.now();

const connectionOptions = {
  host: 'localhost',
  port: 25639,
  negotiationMandatory: false,
  loginPrompt: /login:/i,
  passwordPrompt: /password:/i,
  timeout: 1500,
};

client.on('ready', () => {
  console.log('Discord Rich Presence is ready!');
  setInterval(connectToTS3, 3000);
});

client.login({ clientId: "1330971536496136233" }).catch(console.error);

async function connectToTS3() {
  try {
    await connection.connect(connectionOptions);
    await connection.send(`auth apikey=${ts3ApiKey}\r\n`);
    
    const clientListResponse = await connection.send('clientlist\r\n');
    const myClient = parseClientList(clientListResponse).find(client => client.nickname.includes(robloxUsername));
    
    if (myClient) {
      const channelName = parseChannelName(await connection.send('channelconnectinfo\r\n'));
      client.setActivity({
        details: `In Channel: ${channelName}`,
        state: `Nickname: ${myClient.nickname}`,
        startTimestamp,
        largeImageKey: "parp_logo",
        smallImageKey: "teamspeak_logo",
        largeImageText: "Philadelphia Roleplay",
        smallImageText: "TeamSpeak 3",
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function parseClientList(response) {
  const clientList = response.split('|')
    .filter(line => line.startsWith('clid'))
    .map(line => parseClientData(line));
  
  return clientList;
}

function parseClientData(line) {
  const nicknameMatch = line.match(/client_nickname=([^\s]+)/);
  if (nicknameMatch) {
    const nickname = decodeNickname(nicknameMatch[1]);
    return {
      nickname,
      clientId: line.match(/clid=(\d+)/)?.[1],
      channelId: line.match(/cid=(\d+)/)?.[1]
    };
  }
  return null;
}

function decodeNickname(encodedNickname) {
  return encodedNickname.replace(/\\s/g, ' ').replace(/\\p/g, '|');
}

function parseChannelName(response) {
  let channelName = response.split('\n').find(line => line.startsWith('path'))?.split('=')[1]?.trim(4).replace(/\\s/g, ' ').replace(/\\p/g, '|');
  
  if (channelName && channelName.includes('\/')) {
    channelName = channelName.split('\/').pop();
  }

  return channelName || 'Unknown Channel';
}

connectToTS3();
