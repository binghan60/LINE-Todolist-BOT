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
