const Enrollment=require("../models/enrollmentModel");

exports.getPerformance=async (req, res)=>{
    try{
        const enrollments=await Enrollment.find({student: req.user.id}).populate("course", "courseName");

        if(enrollments.length===0){
            return res.status(404).json({
                message:"No enrollments found"
            })
        }

        let totalMarks=0;
        let totalAttendance=0;

        enrollments.forEach(e=> {
            totalMarks+=e.marks;
            totalAttendance+=e.attendance;
        });

        const avgMarks=totalMarks/enrollments.length;
        const avgAttendance=totalAttendance/enrollments.length;

        let performance;
        if(avgMarks>=85) performance="Excellent";
        else if(avgMarks>=70) performance="Good";
        else if(avgMarks>=50) performace="Average";
        else performance="Needs Improvement";

        res.json({
            totalCourses: enrollments.length,
            averageMarks: avgMarks,
            averageAttendance: avgAttendance,
            performanceStatus: performance
        });
    }catch(error){
        res.status(400).json({
            message: error.message
        });
    }
};