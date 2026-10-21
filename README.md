Small authorisation and authentication server

## TODOs

- Licences,
- resolve URIs to files that people can read
- API endpoint to grant a user a file

Password reset to generate a unique URL the admin can send to the user for them to choose their new password

<!-- TODO: consider if a homepage even makes sense at all -->
<!-- TODO: write seed data for dev -->
<!-- TODO: write load test that creates like a thousand or such of users and licences -->
<!-- TODO: bulk grant licence flow (both multi licence to one user; multi user to one licence) -->

## Testing procedure

visit localhost:3000
attempt to visit /users and /licences (should prompt for login)
login with admin:admin
create user
attempt to create user with the same details (should fail with 'user already exists')


