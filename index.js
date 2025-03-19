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
  const deleteKeyword = "[DELETE]"
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
    altText: `現在有${todoList.list.length}項待辦事項等你唷～快來看看有什麼需要處理的`,  
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#f0f0f0",
        paddingAll: "sm",
        contents: [
          {
            type: "text",
            text: `${user.userName}的待辦事項列表`,
            weight: "bold",
            size: "md",
            align: "center"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "none",
        contents: todoList.list.map((item,index)=>{
          return {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            spacing: "xs",
            cornerRadius: "md",
            paddingAll: "sm",
            contents: [
              {
                type: "text",
                text: `${index+1}. ${item.todo}`,
                wrap: true,
                size: "sm",
                flex: 4
              },
              {
                type: "button",
                style: "link",
                color: "#ff5555",
                action: {
                  type: "message",
                  label: "X",
                  text: `${deleteKeyword}-${item._id}`
                },
                flex: 1
              }
            ],
            height: "30px"
          }
        }),
        margin: "none",
        offsetBottom: "none",
        paddingAll: "md"
      }
    }
  };
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