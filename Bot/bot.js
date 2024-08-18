import { Telegraf } from "telegraf";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
const TOKEN = "7407666002:AAF4C2muWxXQK4hj2VyV5W1HQQ65wOk9z2w";
const bot = new Telegraf(TOKEN);
const web_link = "https://aptos-lottery.vercel.app/";


bot.start((ctx) =>
    ctx.reply("Welcome to Move-Lette", {
        reply_markup: {
            keyboard: [[{ text: "Try Your Luck in Move-Lette", web_app: { url: web_link } }]],
        },
    })
);
function generateRandomFourDigitNumber() {
    // Generate a random number between 0 and 9999
    let randomNum = Math.floor(Math.random() * 10000);

    // Ensure the number is exactly 4 digits
    randomNum = String(randomNum).padStart(4, '0');

    return randomNum;
}
bot.on('message', (ctx) => {
    ctx.reply('Received Purchase');
    console.log(ctx.message.web_app_data);
    if (ctx.message.web_app_data != undefined) {
        const jsonObject = JSON.parse(ctx.message.web_app_data.data);
        console.log(jsonObject);
        if (jsonObject.action === "Add Sticker") {
            bot.telegram.getUserProfilePhotos(ctx.from.id)
                .then(async (photos) => {
                    if (photos.total_count > 0) {
                        // Get the most recent profile picture
                        const photo = photos.photos[photos.total_count - 1];
                        // Get the highest resolution photo
                        const fileId = photo[photo.length - 1].file_id;
                        const wallet = jsonObject.wallet;
                        console.log(jsonObject.wallet);
                        // Send the profile picture to the user
                        ctx.replyWithPhoto(fileId, { caption: "Here is your profile picture!" });
                        const userId = ctx.from.id; // replace with the user_id
                        console.log(userId);
                        console.log(ctx.chat.id);
                        const fileInfo = await ctx.telegram.getFile(fileId);

                        // Download the file
                        const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;
                        const response = await axios({
                            method: 'GET',
                            url: fileUrl,
                            responseType: 'stream',
                        });

                        // Save the file to disk
                        const filePath = `.\\TestImage\\profile_pic_${ctx.from.id}.jpg`;
                        const writer = fs.createWriteStream(filePath);
                        response.data.pipe(writer);

                        writer.on('finish', async () => {
                            console.log(`Profile picture downloaded and saved as ${filePath}`);
                            ctx.reply('Profile picture downloaded successfully!');
                            let data = new FormData();
                            data.append('image', fs.createReadStream(filePath));
                            data.append('user_id', 'logs');
                            data.append('count', '414');
                            data.append('negative_prompt', jsonObject.negative_prompt);
                            data.append('prompt', jsonObject.prompt);
                            console.log(data);
                            let config = {
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: 'https://c86d-34-87-2-210.ngrok-free.app/process_sticker',
                                headers: {
                                    ...data.getHeaders()
                                },
                                data: data,
                                responseType: 'stream',
                            };
                            console.log(config);

                            var destination1 = `.\\TestImage\\profile_sticker_${ctx.from.id}_file.png`;
                            // axios.request(config)
                            //   .then((response) => {
                            //     response.data.pipe(fs.createWriteStream(destination1));
                            //   })
                            //   .catch((error) => {
                            //     console.log(error);
                            //   });
                            const resp = await axios(config);
                            // Create a writable stream to save the file
                            const writer2 = fs.createWriteStream(destination1);

                            // Pipe the response stream to the writer
                            resp.data.pipe(writer2);

                            // Listen for 'finish' event to know when writing is complete
                            writer2.on('finish', () => {
                                console.log('File saved successfully');
                                const name = `Sticker_${generateRandomFourDigitNumber()}_by_move_lette_rewards_bot`; // replace with the name of the sticker set
                                const title = `Movelette-${wallet} Stickers`; // replace with the title of the sticker set

                                const emojis = '🍩'; // replace with the emojis for the sticker
                                bot.telegram.createNewStickerSet(userId, name, title, {
                                    png_sticker: { source: fs.createReadStream(destination1) },
                                    emojis: emojis
                                }
                                )
                                    .then(() => { ctx.reply(`Sticker set created successfully! You can add it here: https://t.me/addstickers/${name}`) })
                                    .catch(err => ctx.reply(`Error: ${err}`));
                            });

                            // Listen for 'error' event to handle any errors
                            writer2.on('error', (err) => {
                                console.error('Error saving file:', err);
                            });


                        });

                        writer.on('error', (err) => {
                            console.error('Error downloading profile picture:', err);
                            ctx.reply('Error downloading profile picture. Please try again later.');
                        });



                    } else {
                        ctx.reply("You don't have a profile picture.");
                    }
                })
                .catch((err) => {
                    console.error('Error fetching profile photos:', err);
                    ctx.reply('Sorry, something went wrong while fetching your profile picture.');
                });
        }
    }
});

bot.launch();
