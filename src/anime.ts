import { Client, TextChannel } from "discord.js";

// If the user asks for "anime tiddies", we have to provide
export const AnimeTiddies = async (c: Client): Promise<string> => {
    return c.channels.fetch('565360702207033344', { force: true })
        .then(channel => channel as TextChannel)
        .then(async channel => {
            let messages = await channel.messages.fetch({ 'limit': 50 });
            const images = [...messages.values()].flatMap(msg =>
                ([...msg.attachments.values()]).map(attachment => attachment.url));
            return images[Math.floor(Math.random() * images.length)];
        })
        .catch(() => "Sorry, I'm having trouble sourcing images right now.");

};