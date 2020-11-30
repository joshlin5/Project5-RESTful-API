In Clemson's CPSC 3750 in Craig Baker's Web Application Programming. Completed in November 2020 by Joshua Lin.
In this project we will be writing a RESTful API in nodejs.  We'll continue to use expressjs to define our routes.  We'll install and use a redis database for our data storage.  We will make endpoints to control data surrounding students and grades.  We will use port 3002 for this and setup nginx reverse proxy and service files just like we did for project . You can go here (Links to an external site.) to see the starter file, but we'll wget it later on.

Instead of accessing our project through the browser, we will use an automated testing tool called Postman (Links to an external site.).  I will be running this test suite (Links to an external site.) against your submissions. 

Your API should validate a username and password against a user object in the redis database.  This object will look and work mostly like it did in our fake db from proj4; it will contain a username, name, hash, and salt.  To protect your API, you should extract basicAuth credentials using the basic-auth module and compare them to the data stored for that user, just like we did in proj4.  If the supplied credentials are invalid, reply with a HTTP 401, otherwise process the request as described below.  There is an app.use that I've partially completed.  Fill out the missing pieces.

In general, your API should return the following HTTP Status Codes:

if successful, 200
if access denied, 401
if user error, 400
if server error, 500
if item not found, 404
Any filtering required below should work as follows.  Remember to save the number of results for X-Total-Count before applying any filters. Filtering should be case insensitive, and should be substring matching as opposed to exact matches.

GET /grades?student_id=username
filters list down to only grades matching given student_id
GET /grades?type=quiz
filters list down to only grades matching given type
GET /grades?student_id=username&type=quiz
filters list down to only grades matching given student_id AND type
Sorting should be implemented as follows:

The value of '_sort' should be an attribute name like 'type'. If '_sort' does not exist, it should default to 'id'.  
Example: GET /grades?_sort=type
if query param '_order' exists and is equal to 'asc', sort the results in ascending order by the attr listed in '_sort'. If '_order' does not exist or is not equal to 'asc', sort in descending order.
Example: GET /grades?_sort=type&_order=asc
Sorting should be case insensitive.
When applying pagination and filtering or sorting, always paginate last. When required, pagination should be implemented as follows:

Only apply pagination if query params '_start', '_limit', or '_end' exist.
if paginating and '_start' does not exist, default _start to 0
if paginating and '_end' doesn't exist and '_limit' exists, set '_end' to '_start' + '_limit'
if paginating and '_end' doesn't exist and '_limit' doesn't exist set '_end' to the number of items after filtering
use Array.slice(_start, _end) on the list of items post filtering, and return that resulting array
A function exists to be used for filtering, sorting, and pagination, called filterSortPaginate. This function has 3 TODOs that needs to be filled out.  

The API
POST /students
add student
Should accept a JSON request body
{"id": "some_username", "name": "some user"}

If no username key, no name key, or no body at all, return 400
If username already exists as a student, return a 400
if successful return 200 status code with a body containing a reference to the newly created item
{"_ref":"/students/some_username", "id":"some_username"}

DELETE /students/:username
delete student
no request body required
if no student exists, return 404
if successful, return 200 along with a response body containing the id of the item that was deleted
{"id":"some_username"}
subsequent requests to GET /students/:username should return a 404
PUT /students/:id
modify student
should accept a JSON request body
{"name":"someone else"}

should only allow name changes, not id (since thats the key)
if try to change id, or no request body, 400
GET /students/:id
get student
should return a 404 if user doesn't exist
should return a 200 with content of JSON user
{"id": "cbaker","name": "someone else", "_ref":"/students/cbaker"}

no queries params here
GET /students
get all students
should return a JSON array. if students don't exist, still return a status 200 with []
should support filtering on id or name.
should support sorting on id or name.
should support pagination. 
Should set a response header called "X-Total-Count" contain the total number of items before any sorting or pagination. 
otherwise, return a indexed array of user objects
[ {"id": "cbaker","name": "someone else", "_ref":"/students/cbaker"}, {"id": "cbaker1","name": "someone else", "_ref":"/students/cbaker1"}, {"id": "cbaker2","name": "someone else", "_ref":"/students/cbaker2"} ]

POST /grades
add grade
the id for grades should be a counter stored in redis, NOT in nodejs (if you store it in node itll reset when node restarts)
Should accept a JSON request body
{ "student_id": "some_username", "type": "quiz", "max": "12", "grade": "12" }

If any of the 4 keys are missing, or no body at all, return 400
if successful return 200 status code with a body containing a reference to the newly created item
{"_ref":"/grades/2", "id": "2"}

Doesn't need to care if student doesn't exist, make item anyway
GET /grades/:id
get grade
should return a 404 if grade with given id doesn't exist
should return a 200 with a full grade object, including the 4 given attributes, the id, and the _ref
{ "student_id": "some_username", "type": "quiz", "max": "12", "grade": "12", "_ref": "/grades/2" , "id": "2"}

PUT /grades/:id
modify grade
should return a 404 if id doesn't exist
should return a 400 if request body is missing, or if no keys exist in the hash
should expect a hashed array of values to change
{ "max": "11", "grade": "13" }

should only accept changes for max, grade, type and student_id
if change(s) successful, return a 200 with no body necessary
DELETE /grades/:id
delete grade
should return a 404 if id doesn't exist
should return a 200 if successfully deleted.
GET /grades
return a list of all grades.
Should be filterable by student_id, type, max and grade.
should support sorting on student_id, type, max and grade.
should support pagination.
Should set a response header called "X-Total-Count" contain the total number of items before any filtering, sorting or pagination.
if no grades exist, return a 200 with a body of []
if grades exist and no GET parameter queries were submitted, return a 200 with a list of all grade objects.
[ { "student_id": "some_username", "type": "quiz", "max": "12", "grade": "12", "_ref": "/grades/2" , "id":"2"}, { "student_id": "some_username1", "type": "quiz", "max": "121", "grade": "12", "_ref": "/grades/3" , "id":"3" } ]

DELETE /db
already written for you

The Database
students holds
SET of student's IDs
student:xyz holds
HASH containing all info about student with id xyz
grades holds
number containing the total number of grades created so far
grade:11 holds
HASH containing all info about grade with id 11
user:cbaker holds
HASH containing login credentials associated with username cbaker
