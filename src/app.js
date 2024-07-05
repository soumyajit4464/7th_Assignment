import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app=express()

//middlewares 
//required to set the origin and credentials
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({limit:"16kb"})) // to limit the data one can enter through json format
app.use(express.urlencoded({extended:true,limit:"16kb"}))// to limit the data entered through url{urlencoded is used so that we can retrieve data from the url}
app.use(express.static("public"))//to store the files and folders to store images and other things
app.use(cookieParser())//to edit and use cookies from users webpage


//routes
import userRouter from'./routes/user.routes.js'

//routes declaration
app.use("/api/v1/users",userRouter)




//http://localhost:8000/api/v1/users/register



export default app
