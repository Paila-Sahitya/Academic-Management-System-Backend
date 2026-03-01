const Course= require("../models/courseModel");

exports.createCourse= async (req, res)=>{
    try{
        const {courseName, courseCode, instructor}=req.body;
        
        const course= await Course.create({
            courseName,
            courseCode, 
            instructor
        });

        res.status(201).json(course);
    }catch(error){
        res.status(400).json({
            message: error.message,
        });
    }
};

exports.getCourses= async(req, res)=>{
    try{
        const courses= await Course.find().populate("instructor", "name email");
        res.json(courses);
    } catch(error) {
        res.status(400).json({
            message:error.message,
        });
    }
};

exports.deleteCourse=async(req,res)=>{
    try{
        const course=await Course.findById(req.params.id);

        if(!course){
            return res.status(404).json({
                message:"Course not found"
            });
        }

        await course.deleteOne();

        res.json({
            message:"Course deleted successfully"
        });
    }catch(error){
        res.status(400).json({
            message: error.message,
        });
    }
};