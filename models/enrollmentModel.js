const mongoose=require("mongoose");

const enrollmentSchema= new mongoose.Schema(
    {
        student: {type: mongoose.Schema.Types.ObjectId, ref:"User", required:true},
        course: {type:mongoose.Schema.Types.ObjectId, ref:"Course", required:true},
        marks: {type:Number, default:0},
        attendance:{type:Number, default:0},
    },
    {
        timestamps:true
    }
);

module.exports=mongoose.model("Enrollment", enrollmentSchema);