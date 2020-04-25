/* eslint-disable no-unused-vars */
var http = require('http');
var config = require('./config');
var iconv = require('iconv-lite');
var htmlToJson = require('html-to-json');
var querystring = require('querystring');

exports.getUTF8 = function (url_path, cb) {
  http.get(url_path, function (res) {
    var str = [];
    res.on('data', function (chunk) {
      str.push(chunk);
    });

    res.on('end', function () {
      var total = 0;
      for (var i = 0; i < str.length; i++) {
        total += str[i].length;
      }
      var content = Buffer.concat(str, total);
      var utf8st = iconv.decode(content, 'win874');
      cb(utf8st);
    });
  });
};


exports.extractLink = function (str, cb) {
  htmlToJson.parse(str, {
    'links': ['a', function ($a) {
      var tmp = {
        'href': $a.attr('href'),
        'text': $a.text()
      };
      return tmp;
    }]
  }, function (err, result) {
    cb(result.links);
  });
}


var getLink = function (str, cb) {
  htmlToJson.parse(str, {
    'links': ['a', function ($a) {
      var tmp = {
        'href': $a.attr('href'),
        'text': $a.text()
      };
      return tmp;
    }]
  }, function (err, result) {
    cb(result.links);
  });
}

var toUTF8 = function (res, cb) {
  var str = [];
  res.on('data', function (chunk) {
    str.push(chunk);
  });

  res.on('end', function () {
    var total = 0;
    for (var i = 0; i < str.length; i++) {
      total += str[i].length;
    }
    var content = Buffer.concat(str, total);
    var utf8st = iconv.decode(content, 'win874');
    cb(utf8st);
  });
};

var login = function (cb) {
  var cookies = '';

  var get_buildkey = function (cb) {
    var options = {
      hostname: 'reg.nu.ac.th',
      path: '/registrar/login.asp',
      method: 'GET'
    };

    var req = http.request(options, function (res) {
      cookies = res.headers['set-cookie'][0];
      var str = '';
      res.on('data', function (chunk) {
        str += chunk;
      });
      res.on('end', function () {
        htmlToJson.parse(str, {
          'input': ['input', function ($input) {
            var tmp = {
              'name': $input.attr('name'),
              'value': $input.attr('value')
            };
            return tmp;
          }]
        }, function (err, result) {
          var build_key = '';
          for (var i = 0; i < result.input.length; i++) {
            if (result.input[i].name == 'BUILDKEY') {
              build_key = result.input[i].value;
              break;
            }
          }
          cb(build_key);
        });
      });
    });
    req.end();
  };

  var go_staff = function (main_url) {
    var options = {
      hostname: 'reg.nu.ac.th',
      path: main_url,
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    };

    var req = http.request(options, function (res) {
      toUTF8(res, function (str) {
        getLink(str, function (links) {
          cb(cookies, links);
        });
      });
    });
    req.end();
  }


  var go_role = function (main_url) {
    var options = {
      hostname: 'reg.nu.ac.th',
      path: '/registrar/' + main_url,
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    };

    var req = http.request(options, function (res) {
      var str = '';
      res.on('data', function (chunk) {
        str += chunk;
      });
      res.on('end', function () {
        htmlToJson.parse(str, {
          'url': function ($doc) {
            return $doc.find('a').attr('href');
          },
        }, function (err, result) {
          go_staff(result.url);
        });
      });
    });
    req.end();
  }

  get_buildkey(function (build_key) {
    var postData = querystring.stringify({
      'BUILDKEY': build_key,
      'f_uid': config.user,
      'f_pwd': config.password
    });

    console.log(postData);

    var options = {
      hostname: 'reg.nu.ac.th',
      path: '/registrar/validate.asp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
        'Cookie': cookies
      }
    };

    var req = http.request(options, function (res) {
      var str = '';
      res.on('data', function (chunk) {
        str += chunk;
      });
      res.on('end', function () {
        htmlToJson.parse(str, {
          'url': function ($doc) {
            return $doc.find('a').attr('href');
          },
        }, function (err, result) {
          go_role(result.url);
          // logon success pass cookie
          // cb(cookies);
        });
      });
    });

    req.write(postData);
    req.end();

    // cb(build_key);
  });
};

exports.getCourseInfo = function (year, semester, courseid, cb) {
  var config = {
    year: year,
    semester: semester,
    courseid: courseid
  }

  login(function (ck, links) {
    var classinfo_url = '';

    for (var i = 0; i < links.length; i++) {
      if ((/^class_info/).test(links[i].href)) {
        classinfo_url = links[i].href;
      }
    }

    console.log('classinfo_url', classinfo_url);

    var options = {
      hostname: 'reg.nu.ac.th',
      path: '/registrar/' + classinfo_url,
      method: 'GET',
      headers: {
        'Cookie': ck
      }
    };

    var req = http.request(options, function (res) {
      toUTF8(res, function (utf8str) {
        htmlToJson.parse(utf8str, {
          'form': ['form', function ($form) {
            return $form.attr("action");
          }]
        }, function (err, result) {
          var forms = result.form;
          var action_url = '';
          for (var i = 0; i < forms.length; i++) {
            if ((/^class_info_1/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck, action_url, config, cb);
        });
      });
    });

    req.end();

    var query_grade = function (cookie, url, cb) {
      console.log(url.href);
      var options = {
        hostname: 'reg.nu.ac.th',
        path: '/registrar/' + url.href,
        method: 'GET',
        headers: {
          'Cookie': cookie
        }
      };

      var req = http.request(options, function (res) {
        toUTF8(res, function (utf8str) {
          htmlToJson.parse(utf8str, {
            'tr': ['tr', function ($tr) {
              var tmp = {
                //  'id': $tr.children(1).text(),
                'id': ($tr.children(1).text()).substring(0, 3),
                'course_plan': $tr.children(3).text(),
                // 'course_plan': $tr.children(3).text().replace(/\s+/g,''),
                'grade': $tr.children(5).text().replace(/\s+/g, '')
              }
              // if(tmp.id.length<20) { 
              return tmp;
              // }
            }]
          }, function (err, result) {
            var r = [];
            var tr = result.tr;
            for (var i = 0; i < tr.length; i++) {
              // if(tr[i]&&(/\d{8}/).test(tr[i].id)) {
              if (tr[i] && ((tr[i].grade.length == 2) | (tr[i].grade.length == 1))) {
                r.push(tr[i]);
              }

            }
            cb(r);
          });
        });
      });
      req.end();
    };

    var query_section = function (cookie, url, cb) {
      console.log(url.href);
      var options = {
        hostname: 'reg.nu.ac.th',
        path: '/registrar/' + url.href,
        method: 'GET',
        headers: {
          'Cookie': cookie
        }
      };

      var req = http.request(options, function (res) {
        toUTF8(res, function (utf8str) {
          htmlToJson.parse(utf8str, {
            'tr': ['tr', function ($tr) {
              var tmp = {
                'count': $tr.children().length,
                'text': $tr.text()
              };

              for (var i = 0; i < $tr.children().length; i++) {
                tmp['td' + i] = $tr.children(i).text();
              }
              return tmp;
            }]
          }, function (err, result) {
            // find group name
            var group_row = 0;
            for (var i = 0; i < result.tr.length; i++) {
              if (result.tr[i].count == 11) {
                group_row = i;
                break;
              }
            }
            console.log('group_row', group_row);
            // group_id
            var idx = group_row + 1;
            var group_id = result.tr[idx].td1.replace(/\s+/g, '');
            var date_section = [];
            while (result.tr[idx].count == 14) {
              var tmp = {
                'day': result.tr[idx].td3,
                'time': result.tr[idx].td4,
                'room': result.tr[idx].td5
              }
              date_section.push(tmp);
              idx++;
            }

            var lecturer = result.tr[idx].td4;




            var section_info = {
              /*'id':result.font[0].value,'name_en':result.font[1].value
              ,'name_th':result.font[2].value	
              ,'faculty':result.font[4].value	
              ,'credit':result.font[6].value	
              ,'semester':result.font[12].value
              ,'planner':result.font[14].value*/
              'id': result.tr[8].td0,
              'name_en': result.tr[8].td1,
              'faculty': result.tr[10].td2,
              'credit': result.tr[11].td2,
              'status': result.tr[12].td2
                //,'planner':result.font[15+add_index].td1
                ,
              'section_no': group_id,
              'date_section': date_section,
              'lecturer': lecturer,
              //  'count_student':grade_list.length
              //,'status_remove_prefix':add_index
              // 'result':result
            };
            //console.log(section_info);
            getLink(utf8str, function (links) {
              for (var i = 0; i < links.length; i++) {
                if ((/^student_inclass/).test(links[i].href)) {
                  query_grade(cookie, links[i], function (grade_list) {
                    section_info['grade_list'] = grade_list;
                    cb(section_info);
                  });
                }
              }
            });
          });

        });
      });

      req.end();
    };

    var submit_form = function (cookie, action_url, config, cb) {
      console.log('submit_form');
      console.log(action_url);
      var postData = querystring.stringify({
        'coursestatus': 'O00',
        'facultyid': 'all',
        'maxrow': '500',
        'acadyear': config.year,
        'semester': config.semester,
        'coursecode': config.courseid,
        'cmd': 2
      });

      var options = {
        hostname: 'reg.nu.ac.th',
        path: '/registrar/' + action_url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length,
          'Cookie': cookie
        }
      };

      var req = http.request(options, function (res) {
        toUTF8(res, function (utf8str) {
          htmlToJson.parse(utf8str, {
            'sections': ['a', function ($a) {
              var tmp = {
                'href': $a.attr('href'),
                'text': $a.text()
              };
              return tmp;
            }]
          }, function (err, result) {
            var r = [];
            for (var i = 0; i < result.sections.length; i++) {
              if (result.sections[i].text == courseid) {
                r.push(result.sections[i]);
              }
            }
            if (r.length == 0) {
              cb([]);
            } else {
              var ret = [];
              for (let i = 0; i < r.length; i++) {
                query_section(cookie, r[i], function (section_info) {
                  ret.push(section_info);
                  if (ret.length == r.length) {
                    cb(ret);
                  }
                });
              }
            }
          });
        });
      });

      req.write(postData);
      req.end();
    };
  });
};

exports.getStudentByProgramInfo = function (year, faculty_id, curriculum_id, cb) {
  var config = {
    acadyear: year,
    faculty_id: faculty_id,
    curriculum_id: curriculum_id
  }

  login(function (ck, links) {
    var studentByProgram_url = '';

    for (var i = 0; i < links.length; i++) {
      if ((/^studentByProgram/).test(links[i].href)) {
        studentByProgram_url = links[i].href;
      }
    }

    console.log('studentByProgram', studentByProgram_url);



    var options = {
      hostname: 'reg.nu.ac.th',
      path: '/registrar/' + studentByProgram_url,
      method: 'GET',
      headers: {
        'Cookie': ck
      }
    };


    var req = http.request(options, function (res) {
      toUTF8(res, function (utf8str) {
        htmlToJson.parse(utf8str, {
          'form': ['form', function ($form) {
            return $form.attr("action");
          }]
        }, function (err, result) {
          var forms = result.form;
          var action_url = '';
          for (var i = 0; i < forms.length; i++) {
            if ((/^studentByProgram/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck, action_url, config, cb);
        });
      });
    });

    req.end();

    var submit_form = function (cookie, action_url, config, cb) {
      console.log('submit_form');
      console.log(action_url);
      var postData = querystring.stringify({
        'acadyear': config.acadyear,
        'facultyid': config.faculty_id

      });


      var options = {
        hostname: 'reg.nu.ac.th',
        path: '/registrar/' + action_url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length,
          'Cookie': cookie
        }
      };


      var req = http.request(options, function (res) {
        toUTF8(res, function (utf8str) {

          var a_herf = [];


          getLink(utf8str, function (links) {
            // console.log(links);


            for (var i = 0; i < links.length; i++) {

              //var split1 =links[i].href.split('?');
              //console.log("split1 = "+split1.length);

              if ((/^studentByProgram/).test(links[i].href)) {
                var split1 = links[i].href.split('?');
                //console.log("split1 = "+split1.length);

                if (split1.length == 2) {

                  var split_amp = split1[1].split('&');

                  if (split_amp.length > 2) {

                    //var split_val=split_amp[1].split('=');

                    var tmp = {
                      'value': links[i].text,
                      'link': links[i].href,
                      //'tail':split1[1],
                      'amp_tail_count': split_amp.length,
                      'amp_value_list': split_amp,
                      'program_id': split_amp[4].split('=')[1].replace(/\s+/g, ''),
                      'cmd': split_amp[0].split('=')[1],
                      'campusid': split_amp[1].split('=')[1],
                      'acadyear': split_amp[2].split('=')[1],
                      'facultyid': split_amp[3].split('=')[1],
                      'flag': split_amp[5].split('=')[0] + '=' + split_amp[5].split('=')[1],
                      'status': (split_amp.length == 6) ? '' : split_amp[6].split('=')[1].replace(/\s+/g, ''),
                    }

                    if ((tmp.program_id == config.curriculum_id) & (tmp.amp_tail_count == 6)) {
                      a_herf.push(tmp);
                    }

                  }
                }
              }

            }

            //console.log(a_herf);

            if (a_herf.length == 1) {
              submit_form_student(ck, a_herf[0].link, config, cb);
            } else {
              console.log('curriculum_id invalid');
            }


          });



        });
      });

      req.write(postData);
      req.end(); //submit_form
    } // end submit_form


    var submit_form_student = function (cookie, action_url, config, cb) {
      console.log('target url is :' + action_url);

      /*var postData = querystring.stringify({
         'acadyear':config.acadyear,
         'facultyid':config.faculty_id
       
        });*/


      var options = {
        hostname: 'reg.nu.ac.th',
        path: '/registrar/' + action_url,
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          //'Content-Length': postData.length,
          'Cookie': cookie
        }
      };


      var req = http.request(options, function (res) {
        toUTF8(res, function (utf8str) {
          htmlToJson.parse(utf8str, {

            'tr': ['tr', function ($tr) {
              var tmp = {
                'count': $tr.children().length,
                'text': $tr.text()
              };

              for (var i = 0; i < $tr.children().length; i++) {
                tmp['td' + i] = $tr.children(i).text();
              }
              return tmp;
            }]


          }, function (err, result) {

            var student_list = [];

            for (var i = 0; i < result.tr.length; i++) {
              if (result.tr[i].count == 7) {

                var tmp = {
                  'student_id': result.tr[i].td1,
                  'curriculum_id': config.curriculum_id,
                  'acadyear': config.acadyear,
                  'faculty_id': config.faculty_id,
                  'fullname': result.tr[i].td2,
                  'status_code': result.tr[i].td3,
                }

                if (Number(tmp.student_id)) {
                  student_list.push(tmp);
                }

              }
            }

            // check insert
            // console.log(result);
            cb(student_list);
          });
        });
      });


      // req.write(postData);
      req.end();
      //cb(data);
    } //submit_form_student

  });
};

exports.getStudentInfo = function (student_id, cb) {
  var config = {
    student_id: student_id
  }

  login(function (ck, links) {
    var student_info_url = '';

    for (var i = 0; i < links.length; i++) {
      if ((/^student_info/).test(links[i].href)) {
        student_info_url = links[i].href;
      }
    }

    console.log('get student info', student_info_url);

    //return;

    var options = {
      hostname: 'reg.nu.ac.th',
      path: '/registrar/' + student_info_url,
      method: 'GET',
      headers: {
        'Cookie': ck
      }
    };


    var req = http.request(options, function (res) {
      toUTF8(res, function (utf8str) {
        htmlToJson.parse(utf8str, {
          'form': ['form', function ($form) {
            return $form.attr("action");
          }]
        }, function (err, result) {
          var forms = result.form;
          var action_url = '';
          for (var i = 0; i < forms.length; i++) {
            if ((/^student_info/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck, action_url, config, cb);
        });
      });
    });

    req.end();

    var submit_form = function (cookie, action_url, config, cb) {

      console.log('submit_form');
      console.log(action_url);

      //return;
      var postData = querystring.stringify({
        'StudentCode': config.student_id

      });


      var options = {
        hostname: 'reg.nu.ac.th',
        path: '/registrar/' + action_url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length,
          'Cookie': cookie
        }
      };


      var req = http.request(options, function (res) {
        toUTF8(res, function (utf8str) {

          htmlToJson.parse(utf8str, {

            'tag': ['tr td FONT', function ($tr) {

              var tmp = {
                'text': $tr.text()
              };

              return tmp;
            }]


          }, function (err, result) {

            console.log(result);

            var student_name = '';
            var student_status = '';
            var student_info = [];
            var curriculum_number = '';
            var curriculum_name = '';
            var degree = '';
            var year = '';
            var gpa_x = '';

            let step = 26;
            let indexKeeper = [];

            for (let j = 0; j < (result.tag.length - 25 - 3) / 9; j++) {
              console.log("start new row " + j);
              console.log(step);

              var passIndex = {
                'acadyear': step++,
                'semester': step++,
                'description': step++,
                'status': step++,
                'gpa': step++,
                'gpax': step++,
                'ca': step++,
                'cax': step++,
                'fee': step++
              }

              indexKeeper.push(passIndex);
            }

            for (let i = 0; i < result.tag.length; i++) {

              if (i == 5) {
                student_status = result.tag[i].text;
              }

              if (i == 7) {
                student_name = result.tag[i].text;
              }

              if (i == 11) {
                degree = result.tag[i].text;
              }

              if (i == 13) {
                let curriculum_obj = result.tag[i].text.split(':');
                curriculum_number = curriculum_obj[0];
                curriculum_name = curriculum_obj[1];
              }

              if (i == 15) {
                gpa_x = result.tag[i].text;
              }

            }


            for (let n = 0; n < indexKeeper.length - 1; n++) {
              console.log("read row " + n);
              console.log(result.tag[indexKeeper[n]['acadyear']].text);


              if ((result.tag[indexKeeper[n]['acadyear']].text).replace(/\s+/g, '') == '') {
                console.log("")
              } else {
                year = result.tag[indexKeeper[n]['acadyear']].text;
              }

              var tmp = {
                'acadyear': year,
                'semester': result.tag[indexKeeper[n]['semester']].text,
                'status': result.tag[indexKeeper[n]['status']].text,
                'description': result.tag[indexKeeper[n]['description']].text,
                'gpa': result.tag[indexKeeper[n]['gpa']].text,
                'gpax': result.tag[indexKeeper[n]['gpax']].text,
                'ca': result.tag[indexKeeper[n]['ca']].text,
                'cax': result.tag[indexKeeper[n]['cax']].text,
                'fee': result.tag[indexKeeper[n]['fee']].text
              }
              //tmp['acadyear'] = year;
              student_info.push(tmp);

            }

            let dataOutput = {
              'student_name': student_name,
              'student_id': config.student_id,
              'status': student_status,
              'gpa_x': gpa_x,
              'degree': degree,
              'curriculum_number': curriculum_number,
              'curriculum_name': curriculum_name,
              'info': student_info,
            }
            cb(dataOutput);
            //cb(result);
          });

        });
      });

      req.write(postData);
      req.end(); //submit_form
    } // end submit_form


  });
};