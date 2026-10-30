// Runs only when initializing an empty MongoDB data volume.
db.getSiblingDB("medassist").createUser({
  user: "medassist_app", pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: "medassist" }],
});
