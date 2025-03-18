import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        userLineId:{type:String, require:true ,unique: true},
        name: { type: String },
    },
    {
        timestamps: true,
    }
);
const User = mongoose.model('User', userSchema);
export default User;