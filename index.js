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

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: "笨豬" }],
    });
  }
  const userLineId = event.source.userId;
  // const message = event.message.text.trim();
  const profile = await client.getProfile(userLineId);
  const user = await User.findOne({ userLineId })
  if (user === null) {
    const newUser = new User({
      userLineId,
      userName: profile.displayName,
      avatar: profile.pictureUrl
    })
    await newUser.save()
  }
  let todoList = await Todo.findOne({ userLineId })
  const newTodo = event.message.text.trim();
  if (todoList === null) {
    todoList = new Todo({
      userLineId,
      list: [{ todo: newTodo }]
    });
  } else {
    todoList.list.push({ todo: newTodo });
  }
  await todoList.save();
  const flexMessage = {
    type: "flex",
    altText: "待辦事項列表",  // 提供一個可替代的文字訊息
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "待辦事項",  // 標題
            weight: "bold",
            size: "lg"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: todoList.list.length > 0
          ? todoList.list.map((todo, index) => ({
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: `${index + 1}. ${todo.todo}`,  // 顯示待辦事項，縮小字體
                wrap: true,
                size: "sm",  // 縮小字體
                flex: 4
              },
              {
                type: "button",
                style: "link",  // 使用 link 按鈕，顯示為紅色 X
                color: "#ff5555",  // 紅色
                action: {
                  type: "message",
                  label: "X",  // 顯示紅色的 X
                  text: `delete:${index}`  // 點擊刪除按鈕時發送 `delete:index` 訊息
                },
                flex: 1,
                height: "sm",
                align: "center"
              }
            ]
          }))
          : [{
            type: "text",
            text: "目前沒有待辦事項",
            wrap: true,
            size: "md"
          }]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "message",
              label: "新增待辦事項",
              text: "新增待辦事項"  // 用戶可以點擊這個按鈕來新增待辦事項
            }
          }
        ]
      }
    }
  };
  const echo = { type: 'text', text: event.message.text };
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [flexMessage],
  });
}



// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});