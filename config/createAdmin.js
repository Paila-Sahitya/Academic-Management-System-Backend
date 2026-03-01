const User=require("../models/userModel");
const bcrypt=require("bcryptjs");

const createAdmin=async()=>{
    try{
        const adminExists=await User.findOne({email:"admin@system.com"});

        if(!adminExists){
            const hashedPassword=await bcrypt.hash("admin123", 10);
            await User.create({
                name: "System Admin",
                email: "admin@system.com",
                password:hashedPassword,
                role:"admin"
            });
            console.log("Admin user created");
        }
    }catch(error){
        console.error("Admin creation failed:", error.message);
    }
};
module.exports=createAdmin;