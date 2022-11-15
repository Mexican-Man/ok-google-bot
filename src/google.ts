import { subtle } from 'crypto';
import { CacheType, ChatInputCommandInteraction } from 'discord.js';
import { config } from 'dotenv';
import { FirebaseApp, initializeApp } from "firebase/app";
import { doc, Firestore, getDoc, getFirestore } from "firebase/firestore";
import { mkdir, readFile, writeFile } from 'fs/promises';
import GoogleAssistant from 'google-assistant';
import path from 'path';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

config();
const __dirname = path.resolve();

let key = Uint8Array.from(atob(await readFile('key.txt', 'utf-8')), c => c.charCodeAt(0));

export const DoGoogleThing = async (i: ChatInputCommandInteraction<CacheType>): Promise<string> => {
    // Login to firebase if needed
    app = app ?? initializeApp({ projectId: 'anime-tiddies', apiKey: process.env.FIREBASE_TOKEN, appId: '1:635255775758:web:fe0ecf09d9a8c65165525f', });
    db = db ?? getFirestore(app);

    // Get the user's id
    const userId = i.user?.id || i.member?.user.id;
    if (!userId) { throw new Error('No user id found'); }

    // Get the server id
    const serverId = i.guildId;

    // Find the corresponding user in the database
    const userDocRef = doc(db, 'assistant-Users', userId);
    const userDocSnapPromise = getDoc(userDocRef);

    // Find the corresponding server in the database
    const serverDocRef = serverId ? doc(db, 'assistant-Servers', serverId) : undefined;
    const serverDocSnapPromise = serverDocRef ? getDoc(serverDocRef) : Promise.resolve(undefined);

    // Await both promises
    const [userDocSnap, serverDocSnap] = await Promise.all([userDocSnapPromise, serverDocSnapPromise]);

    // Pick which document to use
    const docToUse = userDocSnap.exists() ? userDocSnap.data() : serverDocSnap?.exists() ? serverDocSnap.data() : undefined;
    if (!docToUse) { throw new Error('No document found'); }

    // Extract the data, decrypt it
    const data = docToUse as { discord_id: string, iv: string, refresh_token: string; };
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
    const payload = Uint8Array.from(atob(data.refresh_token), c => c.charCodeAt(0));
    const ckey = await subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']);
    const refresh_token = await subtle.decrypt({ name: 'AES-CBC', iv }, ckey, payload,)
        .then(decrypted => new TextDecoder().decode(decrypted));

    // Write to tokens.json
    const tokens = JSON.stringify({ refresh_token });
    await writeFile('./tokens.json', tokens);

    // Create new Google Assistant
    const assistant = new GoogleAssistant({
        keyFilePath: path.resolve(__dirname, 'credentials.json'),
        savedTokensPath: path.resolve(__dirname, 'tokens.json'),
    });

    // Get the query
    const query = i.options.getString('query', true);

    // Return promise wrapper around assistant.on
    return new Promise((resolve, reject) => {
        assistant
            .on('ready', () => assistant.start({
                lang: 'en-US', // language code for input/output (defaults to en-US)
                isNew: true, // set this to true if you want to force a new conversation and ignore the old state
                screen: {
                    isOn: false, // set this to true if you want to output results to a screen
                },
                textQuery: query,
            }))
            .on('started', (conversation: GoogleAssistant) => {
                conversation.on('error', (err: Error) => {
                    // console.log('Assistant error', err);
                    reject(err);
                });


                conversation.on('response', (text: string) => {
                    // console.log('Assistant response:', text);
                    resolve(text);
                });
            });
    });
};