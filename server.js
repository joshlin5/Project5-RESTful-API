const crypto = require('crypto'); 

//some webserver libs
const express = require('express');
const bodyParser = require('body-parser');
const auth = require('basic-auth');

//promisification
const bluebird = require('bluebird');

//database connector
const redis = require('redis');
//make redis use promises
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//create db client
const client = redis.createClient();

const port = process.env.NODE_PORT || 3000;

//make sure client connects correctly.
client.on("error", function (err) {
    console.log("Error in redis client.on: " + err);
});

const setUser = function(userObj){
	return client.hmsetAsync("user:"+userObj.id, userObj ).then(function(){
		console.log('Successfully created (or overwrote) user '+userObj.id);
	}).catch(function(err){
		console.error("WARNING: errored while attempting to create tester user account");
	});

}

//make sure the test user credentials exist
const userObj = {
	salt: new Date().toString(),
	id: 'teacher'
};
userObj.hash = crypto.createHash('sha256').update('testing'+userObj.salt).digest('base64');
//this is a terrible way to do setUser
//I'm not waiting for the promise to resolve before continuing
//I'm just hoping it finishes before the first request comes in attempting to authenticate
setUser(userObj);


//start setting up webserver
const app = express();

//decode request body using json
app.use(bodyParser.json());

//allow the API to be loaded from an application running on a different host/port
app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header('Access-Control-Expose-Headers', 'X-Total-Count');
		res.header('Access-Control-Allow-Methods', "PUT, DELETE, POST, GET, HEAD");
        next();
});

//protect our API
app.use(function(req,res,next){
	switch(req.method){
		case "GET":
		case "POST":
		case "PUT":
		case "DELETE":
			//extract the given credentials from the request
			const creds = auth(req);
			
			//look up userObj using creds.name
			//TODO use creds.name to lookup the user object in the DB
			//use the userObj.salt and the creds.pass to generate a hash
			//compare the hash, if they match call next() and do not use res object
			//to send anything to client
			//if they dont or DB doesn't have the user or there's any other error use the res object 
			//to return a 401 status code
			
			client.hgetallAsync(`user:${creds.name}`)
				.then((userObj)=>{
					if(!userObj){
						res.sendStatus(401);
					}
					else{
						hash = crypto.createHash('sha256').update(creds.pass+userObj.salt).digest('base64');
						if(userObj.hash == hash) {
							next();
						}
						else {
							res.sendStatus(401);
						}
					}
				});
			break;
		default:
			//maybe an options check or something
			next();
			break;
	}
});

//this takes a set of items and filters, sorts and paginates the items.
//it gets it's commands from queryArgs and returns a new set of items
const filterSortPaginate = (type, queryArgs, items) =>{
	let keys;

	//create an array of filterable/sortable keys
	if(type == 'student'){
		keys = ['id','name'];
	}else{
		keys = ['id','student_id','type','max','grade'];
	}


	//applied to each item in items
	//returning true keeps item
	//TODO: fill out the filterer function
	const filterer = (item) =>{
		//loop through keys defined in above scope
			//if this key exists in queryArgs
			//and it's value doesnt match whats's on the item
			//don't keep the item (return false)
		for(let i = 0; i< keys.length; i++){
			console.log("key : ", keys[i])
			if(keys[i] in queryArgs){
				if(!item[keys[i]].toLowerCase().includes(queryArgs[keys[i]].toLowerCase())){
					return false;
				}
			}
		}
		//else return true
		return true;
	};

	//apply above function using Array.filterer
	console.log("keys: ", keys)
	console.log("queryArgs: ", queryArgs)
	items = items.filter(filterer);
	console.log('items after filter:',items)

	//always sort, default to sorting on id
	if(!queryArgs._sort){
		queryArgs._sort = 'id';
	}
	//make sure the column can be sorted
	let direction = 1;
	if(!queryArgs._order){
		queryArgs._order = 'asc';
	}
	if(queryArgs._order.toLowerCase() == 'desc'){
		direction = -1;
	}

	//comparator...given 2 items returns which one is greater
	//used to sort items
	//written to use queryArgs._sort as the key when comparing
	//TODO fill out the sorter function
	const sorter = (a,b)=>{
		//Note direction and queryArgs are available to us in the above scope

		//compare a[queryArgs._sort] (case insensitive) to the same in b
		//save a variable with 1 if a is greater than b, -1 if less and 0 if equal
		
		//multiply by direction to reverse order and return the variable
		let comparison = 0
		if(a[queryArgs._sort].toUpperCase() > b[queryArgs._sort].toUpperCase()){
			comparison = 1
		}else if(a[queryArgs._sort].toUpperCase() < b[queryArgs._sort].toUpperCase()){
			comparison = -1
		}
			return comparison * direction
	};

	//use apply the above comparator using Array.sort
	items.sort(sorter);
	console.log('items after sort:',items)
	//if we need to paginate
	if(queryArgs._start || queryArgs._end || queryArgs._limit){
		//TODO: fill out this if statement
		//define a start and end variable
		//start defaults to 0, end defaults to # of items

		//if queryArgs._start is set, save into start
		//if queryArgs._end is set save it into end
		//	else if queryArgs._limit is set, save end as start+_limit

		//save over items with items.slice(start,end)
		if(!queryArgs._start){
			queryArgs._start = 0
		}
		if(!queryArgs._end && queryArgs._limit){
			queryArgs._end = queryArgs._start + queryArgs._limit
		}
		if(!queryArgs._end && !queryArgs._limit){
                        queryArgs._end = items.length
                }
		items = items.slice(queryArgs._start, queryArgs._end)
	}
	console.log('items after pagination:',items)
	return items;
};

app.get('/students/:id',function(req,res){
	//TODO
	//Hint use hgetallAsync
	const id = req.params['id']
	client.hgetallAsync(`student:${id}`)
		.then((studentObj)=>{
			if(!studentObj) {
				res.sendStatus(404);
				return;
			}
			else {
				res.status(200).json(studentObj);
				return;
			}
		})
		.catch((err)=>{
				console.log('caught an error in get /students/:id',err)
				return err.error;
		})
});
app.get('/students',function(req,res){
	//TODO fill out the function
	//Hint: use smembersAsync, then an array of promises from hgetallAsync and 
	//Promise.all to consolidate responses and filter sort paginate and return them
	client.smembersAsync('students')
		.then((ids)=>{
			const promises = [];
			const results = [];

			for(let i = 0; i<ids.length;i++){
				const id = ids[i];
				promises.push(
				client.hgetallAsync(`student:${id}`)
					.then((result)=>{
						results.push(result);
					})
				)
			}
			Promise.all(promises).then(()=>{
				res.set('X-Total-Count', promises.length)
				const filteredResults = filterSortPaginate('student', req.query || {}, results)
				res.status(200).json(filteredResults);
				return;
			})
		})
});

app.post('/students',function(req,res){
	//TODO
	//Hint: use saddAsync and hmsetAsync
	if(!req.body){
		res.sendStatus(400)
		return;
	}
	else if(!req.body.id || !req.body.name) {
		res.sendStatus(400)
		return;
	}
	const student = {id: req.body.id, name: req.body.name, _ref: `/students/${req.body.id}`}
	client.saddAsync('students', req.body.id)
		.then((result)=>{
			if(result == 1){
				client.hmsetAsync(`student:${req.body.id}`, student)
				res.status(200).json({_ref: `/students/${req.body.id}`, id: `${req.body.id}`})
				return;
			}else{
				res.sendStatus(400)
				return
			}
		})
});
app.delete('/students/:id',function(req,res){
	//TODO
	//Hint use a Promise.all of delAsync and sremAsync
	const id = req.params['id']
	client.delAsync(`student:${id}`)
	.then((response)=>{
		if(response == 1){
			client.sremAsync('students', id)
			.then((response)=>{
				if(response == 0){
					res.sendStatus(404)
					return
				}else{
					res.status(200).json({'id': id})
					return
				}
			})
		}else{
			res.sendStatus(404)
			return
		}
	})
});
app.put('/students/:id',function(req,res){
	//TODO
	//Hint: use client.hexistsAsync and HsetAsync
	if(!req.body){
		res.sendStatus(400)
		return
	}else if(req.body.id || !req.body.name){
		res.sendStatus(400)
		return
	}
	const student_name = req.body.name
	const student_id = req.params['id']
	client.hexistsAsync(`student:${student_id}`, 'name')
		.then((response)=>{
			if(response == 1){
				client.hsetAsync(`student:${student_id}`, 'name', student_name)
				res.status(200).json({'name': student_name})
				return
			}else{
				res.sendStatus(400)
				return
			}
		})
});

app.post('/grades',function(req,res){
	//TODO
	//Hint use incrAsync and hmsetAsync
	if(!req.body){
		res.sendStatus(400)
		return
	}else if(!req.body.student_id || !req.body.type || !req.body.max || !req.body.grade){
		res.sendStatus(400)
		return
	}
	client.incrAsync('grades').then((grade_id)=>{
		gradeObj = {'student_id': req.body.student_id, 'type': req.body.type, 'max': req.body.max, 'grade': req.body.grade, '_ref': `/grades/${grade_id}`, 'id': grade_id}
		client.hmsetAsync(`grade:${grade_id}`, gradeObj).then((response)=>{
			if(response == "OK"){
				res.status(200).json({'_ref': `/grades/${grade_id}`, 'id': `${grade_id}`})
				return
			}else{
				res.send(400)
				return
			}
		})
	})
});
app.get('/grades/:id',function(req,res){
	//TODO
	//Hint use hgetallAsync
	console.log("here at get grades/id")
	client.hgetallAsync(`grade:${req.params['id']}`).then((grade_object)=>{
		if(!grade_object){
			res.sendStatus(404)
			return
		}else{
			res.status(200).json(grade_object)
			return
		}
	})
});
app.put('/grades/:id',function(req,res){
	//TODO
	//Hint use hexistsAsyncand hmsetAsync
	if(!req.body){
		res.sendStatus(400)
		return
	}
	client.getAsync('grades').then((response)=>{
		if(response == null){
			res.sendStatus(400)
			return
		}
	})
	client.hexistsAsync(`grade:${req.params['id']}`, 'student_id').then((response)=>{
		if(response == 1){
			if(req.body.max){
				client.hmsetAsync(`grade:${req.params['id']}`, 'max', req.body.max)
			}
			if(req.body.grade){
                                client.hmsetAsync(`grade:${req.params['id']}`, 'grade', req.body.grade)
                        }
			if(req.body.type){
                                client.hmsetAsync(`grade:${req.params['id']}`, 'type', req.body.type)
                        }
			if(req.body.student_id){
                                client.hmsetAsync(`grade:${req.params['id']}`, 'student_id', req.body.student_id)
                        }
		}else{
			res.sendStatus(404)
			return
		}
	})
	res.sendStatus(200)
	return
});
app.delete('/grades/:id',function(req,res){
	//TODO
	//Hint use delAsync .....duh
	client.delAsync(`grade:${req.params['id']}`).then((response)=>{
		if(response == 0){
			res.sendStatus(404)
			return
		}else{
			res.sendStatus(200)
			return
		}
	})
});

app.get('/grades',function(req,res){
	//TODO
	//Hint use getAsync, hgetallAsync
	//and consolidate with Promise.all to filter, sort, paginate
	client.getAsync('grades').then((num_grades)=>{
		const promises = [];
		const results = [];
		if(!num_grades){
			res.set('X-Total-Count', 0)
			res.status(200).json([])
			return
		}
                for(let i = 1; i<=num_grades;i++){
			promises.push(client.hgetallAsync(`grade:${i}`).then((grade_obj)=>{
				if(grade_obj){
					results.push(grade_obj);
				}
			}))
		}
                Promise.all(promises).then(()=>{
			res.set('X-Total-Count', results.length)
                        const filteredResults = filterSortPaginate('grade', req.query || {}, results)
                        res.status(200).json(filteredResults);
                        return;
		})
	})
});
app.delete('/db',function(req,res){
	client.flushallAsync().then(function(){
		//make sure the test user credentials exist
		const userObj = {
			salt: new Date().toString(),
			id: 'teacher'
		};
		userObj.hash = crypto.createHash('sha256').update('testing'+userObj.salt).digest('base64');
		//this is a terrible way to do setUser
		//I'm not waiting for the promise to resolve before continuing
		//I'm just hoping it finishes before the first request comes in attempting to authenticate
		setUser(userObj).then(()=>{
			res.sendStatus(200);
		});
	}).catch(function(err){
		res.status(500).json({error: err});
	});
});

app.listen(port, function () {
  console.log('Example app listening on port '+port+'!');
});
