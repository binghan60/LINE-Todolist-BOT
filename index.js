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
  const profile = await client.getProfile(userLineId);
  const user = await User.findOne({ userLineId });

  if (user === null) {
    const newUser = new User({
      userLineId,
      userName: profile.displayName,
      avatar: profile.pictureUrl
    });
    await newUser.save();
  }

  const newTodo = event.message.text.trim();
  let todoList = await Todo.findOne({ userLineId });

  if (todoList === null) {
    todoList = new Todo({
      userLineId,
      list: [{ todo: newTodo }]
    });
  } else {
    todoList.list.push({ todo: newTodo });
  }

  await todoList.save();

  // 建立 Flex Message 的內容
  const flexMessage = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "待辦事項列表",
          weight: "bold",
          size: "xl"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: todoList.list.map((item, index) => ({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: `${index + 1}. ${item.todo}`,
            size: "sm",
            wrap: true
          },
          {
            type: "button",
            style: "primary",
            action: {
              type: "message",
              label: `刪除 ${index + 1}`,
              text: `刪除待辦 ${index + 1}`
            }
          }
        ]
      }))
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: []
    },
    styles: {
      header: {
        backgroundColor: "#ffaaaa"
      },
      body: {
        backgroundColor: "#aaffaa"
      },
      footer: {
        backgroundColor: "#aaaaff"
      }
    }
  };

  // 回覆 Flex Message
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