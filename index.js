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

  // 如果沒有該用戶資料，就創建一個新用戶
  if (user === null) {
    const newUser = new User({
      userLineId,
      userName: profile.displayName,
      avatar: profile.pictureUrl
    });
    await newUser.save();
  }

  // 查找該用戶的待辦清單
  let todoList = await Todo.findOne({ userLineId });
  const newTodo = event.message.text.trim();

  // 如果沒有待辦清單，則創建一個新的待辦清單
  if (todoList === null) {
    todoList = new Todo({
      userLineId,
      list: [{ todo: newTodo }]
    });
  } else {
    // 否則把新的待辦項目推送到清單中
    todoList.list.push({ todo: newTodo });
  }

  await todoList.save();

  // 構建 Flex Message 顯示待辦清單
  const messages = todoList.list.map((item, index) => {
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${index + 1}. ${item.todo}`,
          weight: 'bold',
          size: 'md',
          color: '#000000'
        },
        {
          type: 'text',
          text: `${item.date.toLocaleString()}`,
          size: 'sm',
          color: '#999999',
          align: 'end'
        },
        {
          type: 'button',
          action: {
            type: 'message',
            label: '刪除',
            text: `刪除待辦 ${index + 1}`, // 回傳用於刪除的指令
          },
          style: 'primary',
          color: '#ff6f61',
          margin: 'md'
        }
      ]
    };
  });

  // 包裹 Flex Message 顯示內容
  const flexMessage = {
    type: 'flex',
    altText: '你的待辦清單',
    contents: {
      type: 'carousel',  // 如果有多個內容項目，使用 carousel
      contents: messages   // 這裡是包含多個待辦項目的訊息
    }
  };

  // 回傳 Flex Message
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [flexMessage],
  });
}
