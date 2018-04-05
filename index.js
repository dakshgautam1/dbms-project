const oracledb = require('oracledb');
const express = require('express')
const app = express()

const username = process.env.username || '<your_user_name>'
const password = process.env.password || '<your_oracle_password>'
const dbuser = process.env.dbuser || 'manika.'


queryExecuteWithOracle = (query, params, applyFunction) => {

  let pool = oracledb.getPool()
  return pool.getConnection()
  .then((conn) => conn.execute(query, params))
  .then(result => result.rows)
  .then(result => applyFunction(result))
  .then(result => result)
  .catch(err => {
    console.log(err)
    return {
      "error": err,
      "type": "Some kind of error occured with query/connection pooling"
    }
  })

}


transform = (result) => {
  return result;
}

app.get('/test', (req, res) => {
  queryExecuteWithOracle(`select * from ${dbuser}city`, [], transform)
  .then((result) => {
    res.send({
      "result": result
    })
  })
  .catch(err => {
    res.send({
      "error": "Some error with the connection setup"
    })
  })

})


const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  oracledb.createPool(
    {
      user          : username,
      password      : password,
      connectString : "oracle.cise.ufl.edu:1521/orcl"
    }
  ).then(() => {
    console.log('established pool')
    console.log('Starting server on ..... ' + PORT)
  })
})

process.on('SIGINT', () => {
  log.info('releasing Oracle pool')
  poolP
  .then(pool => BP.fromNode(cb => pool.terminate(cb)))
  .then(() => process.exit(0), e => {throw e})
})