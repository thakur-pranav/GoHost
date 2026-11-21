// Static pages: home, privacy and terms.
module.exports.home = (req, res) => {
  res.render("home.ejs");
};

module.exports.privacy = (req, res) => {
  res.render("privacy.ejs");
};

module.exports.terms = (req, res) => {
  res.render("terms.ejs");
};
