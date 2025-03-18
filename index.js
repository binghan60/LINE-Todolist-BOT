import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import * as line from '@line/bot-sdk'; // 修改這行

dotenv.config();
const app = express();
app.use(express.json());

// 連接 MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB 連線成功'))
  .catch((err) => console.error('MongoDB 連線失敗:', err));

const Todo = mongoose.model('Todo', {
  userId: String,
  text: String,
  done: Boolean,
});

// LINE 設定
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};
console.log(lineConfig)
const client = new line.Client(lineConfig);

app.get('/', async (req, res) => {
  res.json('LINE BOT API');
});

app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  console.log('Request signature:', req.headers['x-line-signature']);
  const events = req.body.events;
  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      await handleTextMessage(event);
    }
  }
  res.sendStatus(200);
});


async function handleTextMessage(event) {
  const userId = event.source.userId;
  const message = event.message.text.trim();

  if (message.startsWith('新增 ')) {
    const text = message.replace('新增 ', '');
    await Todo.create({ userId, text, done: false });
    return replyText(event.replyToken, `已新增: ${text}`);
  }

  if (message === '清單') {
    const todos = await Todo.find({ userId, done: false });
    const list = todos.map((t, i) => `${i + 1}. ${t.text}`).join('\n') || '目前沒有待辦事項';
    return replyText(event.replyToken, `你的待辦事項:\n${list}`);
  }

  if (message.startsWith('完成 ')) {
    const index = parseInt(message.replace('完成 ', '')) - 1;
    const todos = await Todo.find({ userId, done: false });
    if (todos[index]) {
      await Todo.findByIdAndUpdate(todos[index]._id, { done: true });
      return replyText(event.replyToken, `已完成: ${todos[index].text}`);
    } else {
      return replyText(event.replyToken, `找不到對應的待辦事項`);
    }
  }

  return replyText(event.replyToken, '請輸入「新增 xxx」、「清單」、「完成 x」');
}

function replyText(replyToken, text) {
  return client.replyMessage(replyToken, { type: 'text', text });
}

// 不要使用 app.listen()
export default app;
