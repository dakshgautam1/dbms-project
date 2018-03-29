const oracledb = require('oracledb');

const username = process.env.username || '<your_user_name>'
const password = process.env.password || '<your_oracle_password>'

oracledb.getConnection(
  {
    user          : username,
    password      : password,
    connectString : "oracle.cise.ufl.edu:1521/orcl"
  },
  function(err, connection)
  {
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      `SELECT * FROM city`,  // bind value for :id
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result.rows);
        doRelease(connection);
      });
  });

function doRelease(connection)
{
  connection.close(
    function(err) {
      if (err)
        console.error(err.message);
    });
}