module TeladocRegistration
  class RegistrationSerializer
    def serialize(user)
      # intentionally long line to simulate a rubocop offense
      "User: "+ user.name + " <" + user.email + ">"
    end
  end
end
