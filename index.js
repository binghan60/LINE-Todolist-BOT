import * as line from '@line/bot-sdk'
import express from 'express'
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/userSchema.js';
import Todo from './models/todoSchema.js';

dotenv.config();
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});
const app = express();
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('資料庫連線成功');
  })
  .catch((err) => {
    console.log('資料庫連線失敗');
    console.err(err.message);
  });

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

import mongoose from 'mongoose';

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: "笨豬" }],
    });
  }

  const userId = event.source.userId;
  const newTodo = event.message.text.trim();

  // 取得使用者資訊
  const profile = await client.getProfile(userId);

  // 確保使用者存在
  let user = await User.findOne({ userLineId: userId });
  if (!user) {
    user = new User({
      userLineId: userId,
      userName: profile.displayName,
      avatar: profile.pictureUrl
    });
    await user.save();
  }

  // **修正查詢 Todo 的 userId 型別**
  const userObjectId = new mongoose.Types.ObjectId(user._id);

  let todoList = await Todo.findOne({ userId: userObjectId });

  if (!todoList) {
    // 沒有就建立新的
    todoList = new Todo({
      userId: userObjectId,
      list: [{ todo: newTodo }]
    });
  } else {
    // 已有就 push 新的 todo
    todoList.list.push({ todo: newTodo });
  }

  // 儲存資料
  await todoList.save();

  // 回傳訊息
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{
      type: 'text',
      text: todoList.list.map((item, index) => `${index + 1}. ${item.todo}`).join("\n")
    }]
  });
}




// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});