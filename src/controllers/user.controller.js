import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens= async(userId)=>
{
    try {
        const user= await User.findById(userId)  
        const accessToken=user.generateAccessToken()    
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave: false })
        //await user.save()

        return {accessToken,refreshToken}

    } catch (error) {
        console.log("Erorrrrrrrrrrrrr" ,error)
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens:",error);
        
    }
}


const registerUser = asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation(username and email are not empty)
    //check if user already exists: username and email
    //check for images,check for avatar
    //upload them to cloudinary
    //create user object - create entry in db
    //remove refresh token and password field from response
    //check for user creation
    //return response

    const{fullName,email,username,password}=req.body
    //console.log(req.body);
    //console.log("email: ",email)

    if(
        [fullName,email,username,password].some((field) =>
        field?.trim() === "")//The some() method executes the callback function once for each array element.
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser= await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser){
        console.log("Existed User: ",existedUser)
        throw new ApiError(409, "User with email or username already exists ")
    }
    //console.log(req.files)

    const user=await User.create({
        fullName,
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the User ")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})


const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username or email for login
    //find the user
    //password check
    //access and refresh token
    //send cookies(access and refresh token)

    const {username,email,password}=req.body

    if(!username && !email){
        throw new ApiError(400,"Username and email both are required")
    }

    const user= await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

     const LoggedInUser=  await User.findById(user._id).select("-password -refreshToken")

     const options={
        httpOnly:true,
        secure: true
     }

     return res.status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
        new ApiResponse(
            200,
            {
                user:LoggedInUser,accessToken,refreshToken
            },
           "User Logged in Successfully" 
        )
     )
})


const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure: true
     }

     return res
     .status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new ApiResponse(200,{},"User logged out successfully"))
})


const refreshAccessToken= asyncHandler(async(req,res)=>
    {
    const incomingRefreshToken=req.cookies.refresh || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)//user gets encrypted token and in the database we store raw token so we need to check it in this manner
    
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const{accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid refresh token")
    }

})

const changeCurrentPassword =asyncHandler(async(req,res)=>
    {
        const{oldPassword, newPassword}=req.body

        const user=await User.findById(req.user?._id)
        const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400,"Invalid old password")
        }

        user.password=newPassword
        await user.save({validateBeforeSave:false})

        return res
        .status(200)
        .json(new ApiResponse(200,{},"Password changed successfully"))
})


const getCurrentUser= asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})


const updateAccountDetails= asyncHandler(async(req,res)=>{
    const { fullName, email }=req.body

    if(!fullName ||!email){
        throw new ApiError(400,"All fields are required")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})



export{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
}
