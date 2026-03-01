const Enrollment=require("../models/enrollmentModel");
const Course=require("../models/courseModel");

exports.enrollCourse= async(req,res)=>{
    try{
        const {courseId}=req.body;
        const existing=await Enrollment.findOne({
            student: req.user.id,
            course: courseId
        });

        if(existing){
            return res.status(400).json({
                message:"Already enrolled"
            });
        }

        const enrollment= await Enrollment.create({
            student: req.user.id,
            course: courseId
        });
        res.status(201).json({
            enrollment
        })
    }catch(error){
        res.status(400).json({
            message: error.message
        });
    }
};

exports.updateMarks= async(req, res)=>{
    try{
        const {marks}=req.body;
        const enrollment=await Enrollment.findById(req.params.id);

        if(!enrollment){
            return res.status(400).json({
                message: "Enrollment not found"
            });
        }

        enrollment.marks=marks;
        await enrollment.save();

        res.json({
            message:"Marks updated",
            enrollment
        });
    }catch(error){
        res.status(400).json({
            message:error.message
        });
    }
};

exports.updateAttendance= async(req, res)=>{
    try{
        const {attendance}=req.body;
        const enrollment=await Enrollment.findById(req.params.id);
        
        if(!enrollment){
            return res.status(404).json({
                message:"Enrollment not found"
            });
        }

        enrollment.attendance=attendance;
        await enrollment.save();

        res.status(200).json({
            message:"Attendance updated",
            enrollment
        });
    }catch(error){
        res.status(400).json({
            message:error.message
        });
    }
};

exports.getMyEnrollments=async (req, res)=>{
    try{
        const enrollment=await Enrollment.find({student:req.user.id}).populate("course", "courseName courseCode");
        res.json(enrollment);
    }catch(error){
        res.status(400).json({
            message: error.message
        });
    }
};