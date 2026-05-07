import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '../data/suggestionChannels.json');

const readConfig = async () => {
    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const writeConfig = async (data) => {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2));
};

export const getSuggestionChannel = async (guildId) => {
    const config = await readConfig();
    return config[guildId] || null;
};

export const setSuggestionChannel = async (guildId, channelId) => {
    const config = await readConfig();
    config[guildId] = channelId;
    await writeConfig(config);
};
