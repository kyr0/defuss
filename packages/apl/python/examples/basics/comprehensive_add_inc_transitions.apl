# prompt: step1
## user
Step 1: Initialize

# post: step1
{{ set_context('next_step', 'step2') }}

# prompt: step2
## user  
Step 2: Process

# post: step2
{{ set_context('next_step', 'step3') }}

# prompt: step3
## user
Step 3: Finalize
