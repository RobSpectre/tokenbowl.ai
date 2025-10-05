#!/bin/bash

# Fix remaining responsive classes in Draft.vue
sed -i \
  -e 's/\.text-gray-300\.text-sm\.sm:text-base/class="text-gray-300 text-sm sm:text-base"/g' \
  -e 's/\.flex\.items-center\.gap-1\.sm:gap-2/class="flex items-center gap-1 sm:gap-2"/g' \
  -e 's/img\.h-5\.w-5\.sm:h-6\.sm:w-6\.object-contain(/img(class="h-5 w-5 sm:h-6 sm:w-6 object-contain"/g' \
  -e 's/img\.h-6\.w-6\.sm:h-8\.sm:w-8\.rounded-full\.object-cover\.hidden\.sm:block(/img(class="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover hidden sm:block"/g' \
  -e 's/\.text-white\.font-semibold\.text-xs\.sm:text-sm/class="text-white font-semibold text-xs sm:text-sm"/g' \
  -e 's/td(class="px-2 sm:px-4 py-3")\.hidden\.sm:table-cell/td(class="px-2 sm:px-4 py-3 hidden sm:table-cell")/g' \
  -e 's/\.text-gray-300\.text-xs\.sm:text-sm/class="text-gray-300 text-xs sm:text-sm"/g' \
  -e 's/\.text-yellow-400\.font-bold\.text-xs\.sm:text-sm/class="text-yellow-400 font-bold text-xs sm:text-sm"/g' \
  -e 's/\.text-blue-400\.font-semibold\.text-xs\.sm:text-sm/class="text-blue-400 font-semibold text-xs sm:text-sm"/g' \
  -e 's/\.text-green-400\.font-semibold\.text-xs\.sm:text-sm/class="text-green-400 font-semibold text-xs sm:text-sm"/g' \
  -e 's/\.bg-gradient-to-r\.from-purple-600\.to-purple-800\.rounded-t-lg\.px-4\.sm:px-6\.py-4\.border-b-4\.border-yellow-400\.mb-8/class="bg-gradient-to-r from-purple-600 to-purple-800 rounded-t-lg px-4 sm:px-6 py-4 border-b-4 border-yellow-400 mb-8"/g' \
  -e 's/h2\.text-white\.text-2xl\.sm:text-3xl\.font-black\.uppercase\.tracking-wide\.flex\.items-center\.gap-3/h2(class="text-white text-2xl sm:text-3xl font-black uppercase tracking-wide flex items-center gap-3")/g' \
  -e 's/\.grid\.grid-cols-1\.md:grid-cols-2\.gap-4\.sm:gap-8/class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8"/g' \
  -e 's/\.px-4\.sm:px-6\.py-3\.sm:py-4\.border-b\.border-slate-800/class="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800"/g' \
  -e 's/\.flex\.items-center\.gap-2\.sm:gap-3/class="flex items-center gap-2 sm:gap-3"/g' \
  -e 's/img\.h-8\.w-8\.sm:h-10\.sm:w-10\.object-contain(/img(class="h-8 w-8 sm:h-10 sm:w-10 object-contain"/g' \
  /media/rspectre/Storage/workspace/tokenbowl.ai/src/pages/Draft.vue

echo "Fixed responsive classes in Draft.vue"