# pre: lazy_test
set_context('user_name', 'World')
set_context('counter', 0)

# prompt: lazy_test
## user
Hello {{ user_name }}, counter is {{ counter }}

# post: lazy_test
if counter < 3
    set_context('counter', counter + 1)
    set_context('next_step', 'lazy_test')
else
    set_context('next_step', 'return')
endif
