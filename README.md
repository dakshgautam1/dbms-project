# DBMS Project

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. 

### Installing

After forking the repository. Go to the folder. Run this command. 

```
npm install
```

### Set the enviorment variables

Set the oracle database variables variables in the command line (terminal) 

```
# string name without quotes

export username=<username>
# e.g - export username=daksh
export username=<password>
# e.g - export username=password123

```

##### OR

Set the variables in "index.js" directly. 

```
# string name with quotes

const username = process.env.username || 'daksh'
const password = process.env.password || 'password123'

```
