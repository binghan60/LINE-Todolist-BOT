import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema(
    {
        userLineId: { type: String, required: true, index: true },
        list: [
            { 
                date: { type: Date, default: Date.now, index: true }, 
                todo: { type: String, required: true } 
            }
        ],
    },
);

const Todo = mongoose.model('Todo', todoSchema);
export default Todo;
